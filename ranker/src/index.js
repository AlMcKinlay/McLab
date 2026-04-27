import React from "react";
import ReactDOM from "react-dom/client";
import "shared-utils/theme-variables.css";
import "shared-utils/shared-styles.css";
import "./index.css";
import App from "./app/App";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

reportWebVitals();
