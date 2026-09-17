import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getDocuments, getConversations, login, register, refresh } from "@/lib/api";

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

const expired =
    (okData: unknown): Handler =>
    (_config, attempt) =>
        attempt === 1 ? { status: 401 } : { status: 200, data: okData };

describe("api 401 interceptor", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("refreshes the session and retries the original request once", async () => {
        serve({
            "GET /documents": expired(["a.pdf"]),
            "POST /auth/refresh": () => ({ status: 200 }),
        });

        await expect(getDocuments()).resolves.toEqual(["a.pdf"]);
        expect(calls).toEqual(["GET /documents", "POST /auth/refresh", "GET /documents"]);
    });

    it.each([
        ["login", () => login("a@b.com", "wrong"), "POST /auth/login"],
        ["register", () => register("a@b.com", "pw"), "POST /auth/register"],
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

        await expect(Promise.all([getDocuments(), getConversations()])).resolves.toEqual([["a.pdf"], []]);
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
