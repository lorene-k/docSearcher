import "@testing-library/react";

// silence act() warnings in tests
const originalError = console.error.bind(console.error);
beforeAll(() => {
    console.error = (msg: string, ...args: unknown[]) => {
        if (typeof msg === "string" && msg.includes("act(")) return;
        originalError(msg, ...args);
    };
});
afterAll(() => {
    console.error = originalError;
});
