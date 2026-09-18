import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getDocuments, getConversations, getGroups, login, register, refresh, errorCode } from "@/lib/api";

// lib/api.ts calls axios.create() at import time, before any test-file binding exists,
// so the created instance is stashed on the mocked module itself.
jest.mock("axios", () => {
    const actual = jest.requireActual("axios");
    const axiosDefault = actual.default ?? actual;
    const mocked = {
        ...axiosDefault,
        createdInstance: undefined as unknown,
        create: (config: object) => {
            mocked.createdInstance = axiosDefault.create(config);
            return mocked.createdInstance;
        },
    };
    return { __esModule: true, ...actual, default: mocked };
});

const apiInstance = () => (axios as unknown as { createdInstance: AxiosInstance }).createdInstance;

type Reply = { status: number; data?: unknown };
type Handler = (config: InternalAxiosRequestConfig, attempt: number) => Reply;

let calls: string[];

const serve = (routes: Record<string, Handler>) => {
    calls = [];
    const attempts: Record<string, number> = {};
    apiInstance().defaults.adapter = async (config: InternalAxiosRequestConfig) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        calls.push(key);
        attempts[key] = (attempts[key] ?? 0) + 1;
        const handler = routes[key];
        const { status, data } = handler ? handler(config, attempts[key]) : { status: 404 };
        const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse;
        if (status >= 400) throw new AxiosError(`HTTP ${status}`, undefined, config, null, response);
        return response;
    };
};

const PROFILE = { first_name: "Ada", last_name: "Lovelace", org_name: "Analytical Engines" };

const expired =
    (okData: unknown): Handler =>
    (_config, attempt) =>
        attempt === 1 ? { status: 401 } : { status: 200, data: okData };

describe("api 401 interceptor", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("user_email", "a@b.com");
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("refreshes the session and retries the original request once", async () => {
        serve({
            "GET /documents": expired(["a.pdf"]),
            "POST /auth/refresh": () => ({ status: 200 }),
        });

        await expect(getDocuments()).resolves.toMatchObject([{ filename: "a.pdf" }]);
        expect(calls).toEqual(["GET /documents", "POST /auth/refresh", "GET /documents"]);
    });

    it.each([
        ["login", () => login("a@b.com", "wrong"), "POST /auth/login"],
        ["register", () => register("a@b.com", "pw", PROFILE), "POST /auth/register"],
        ["refresh", () => refresh(), "POST /auth/refresh"],
    ])("does not try to refresh when %s itself returns 401", async (_name, call, route) => {
        serve({ [route]: () => ({ status: 401 }) });

        await expect(call()).rejects.toMatchObject({ response: { status: 401 } });
        expect(calls).toEqual([route]);
    });

    it("shares a single refresh between concurrent 401s", async () => {
        serve({
            "GET /documents": expired(["a.pdf"]),
            "GET /conversations": expired([]),
            "POST /auth/refresh": () => ({ status: 200 }),
        });

        await expect(Promise.all([getDocuments(), getConversations()])).resolves.toMatchObject([
            [{ filename: "a.pdf" }],
            [],
        ]);
        expect(calls.filter((c) => c === "POST /auth/refresh")).toHaveLength(1);
    });

    it("does not loop when the retried request is still unauthorized", async () => {
        serve({
            "GET /documents": () => ({ status: 401 }),
            "POST /auth/refresh": () => ({ status: 200 }),
        });

        await expect(getDocuments()).rejects.toMatchObject({ response: { status: 401 } });
        expect(calls).toEqual(["GET /documents", "POST /auth/refresh", "GET /documents"]);
    });

    it("clears the stored session and sends the user to /login when refresh fails", async () => {
        // jsdom cannot navigate, so the redirect to /login shows up as a "navigation" console error
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
        localStorage.setItem("user_email", "a@b.com");
        serve({
            "GET /documents": () => ({ status: 401 }),
            "POST /auth/refresh": () => ({ status: 401 }),
        });

        await expect(getDocuments()).rejects.toBeDefined();
        expect(localStorage.getItem("user_email")).toBeNull();
        expect(consoleError).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("navigation") }),
        );
    });

    it("passes non-401 errors straight through without refreshing", async () => {
        serve({ "GET /documents": () => ({ status: 500 }) });

        await expect(getDocuments()).rejects.toMatchObject({ response: { status: 500 } });
        expect(calls).toEqual(["GET /documents"]);
    });
});

describe("register", () => {
    beforeEach(() => localStorage.clear());

    it("sends the profile and org name along with the credentials", async () => {
        let body: unknown;
        serve({
            "POST /auth/register": (config) => {
                body = JSON.parse(config.data as string);
                return { status: 202, data: { status: "confirmation_required" } };
            },
        });

        await register("a@b.com", "pw", PROFILE);

        expect(body).toEqual({ email: "a@b.com", password: "pw", ...PROFILE });
    });

    it("remembers the org locally until the backend returns it", async () => {
        serve({ "POST /auth/register": () => ({ status: 202, data: { status: "confirmation_required" } }) });

        await register("a@b.com", "pw", PROFILE);

        expect(localStorage.getItem("docsearcher:placeholder")).toContain("Analytical Engines");
    });
});

describe("placeholder fallback", () => {
    beforeEach(() => localStorage.clear());

    it("answers from the local store when the endpoint does not exist yet", async () => {
        localStorage.setItem("user_email", "a@b.com");
        serve({ "GET /org/groups": () => ({ status: 404 }) });

        await expect(getGroups()).resolves.toEqual([]);
        expect(localStorage.getItem("docsearcher:placeholder-used")).toBe("1");
    });

    it("passes real answers straight through", async () => {
        const groups = [{ id: "g1", name: "Research", admin_id: "u1", member_ids: [], created_at: "2026-01-01" }];
        serve({ "GET /org/groups": () => ({ status: 200, data: groups }) });

        await expect(getGroups()).resolves.toEqual(groups);
        expect(localStorage.getItem("docsearcher:placeholder-used")).toBeNull();
    });

    it("still surfaces other errors", async () => {
        serve({ "GET /org/groups": () => ({ status: 500 }) });

        await expect(getGroups()).rejects.toMatchObject({ response: { status: 500 } });
    });
});

describe("errorCode", () => {
    it("reads the code the backend puts in detail", async () => {
        serve({ "POST /auth/register": () => ({ status: 409, data: { detail: "email_exists" } }) });

        const error = await register("a@b.com", "pw", PROFILE).catch((e: unknown) => e);
        expect(errorCode(error)).toBe("email_exists");
    });

    it("returns an empty code when the response carries no usable detail", async () => {
        serve({ "POST /auth/register": () => ({ status: 500, data: { detail: { message: "boom" } } }) });

        const error = await register("a@b.com", "pw", PROFILE).catch((e: unknown) => e);
        expect(errorCode(error)).toBe("");
    });

    it("returns an empty code for a plain error", () => {
        expect(errorCode(new Error("network"))).toBe("");
    });
});
