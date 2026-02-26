import React, { useEffect } from "react";
import "shared-utils/theme-variables.css";
import "shared-utils/shared-styles.css";
import "./App.css";
import { initializeTheme } from "shared-utils";
import { getBoardDataFromUrl } from "./utils/boardUtils";
import GeneratorPage from "./pages/GeneratorPage";
import ViewerPage from "./pages/ViewerPage";

function App() {
	useEffect(() => {
		initializeTheme();
	}, []);

	const isViewingBoard = getBoardDataFromUrl() !== null;

	return isViewingBoard ? <ViewerPage /> : <GeneratorPage />;
}

export default App;
