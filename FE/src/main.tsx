import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/queryClient";
import { router } from "./app/router";
import ThemeSync from "./components/ThemeSync";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeSync>
                <RouterProvider router={router} />
            </ThemeSync>
        </QueryClientProvider>
    </React.StrictMode>
);
