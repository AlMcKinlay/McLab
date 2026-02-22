import React, { useState, useEffect } from "react";
import "./App.css";
import { regions, REGIONS } from "./regions";
import GameEntry from "./GameEntry";
import { initializeTheme } from "shared-utils";

const getData = async (regionKey) => {
	const prices = [];
	const region = regions[regionKey];
	const regionFetch = (num) =>
		region.fetch(num, region.getURL, region.method, region.getBody);

	return regionFetch(0)
		.then((data) => {
			const promises = [];
			let i = 0;
			while (i * 24 < region.getNumHits(data)) {
				promises.push(regionFetch(i));
				i++;
			}
			return Promise.all(promises);
		})
		.then((results) => {
			return results.reduce((arr, val) => arr.concat(region.reduce(val)), []);
		})
		.then((data) =>
			data.forEach((doc) => {
				prices.push(region.map(doc));
			}),
		)
		.then(() => prices);
};

function App() {
	const [prices, setPrices] = useState([]);
	const [region, setRegion] = useState(REGIONS.EU);

	useEffect(() => {
		initializeTheme();
	}, []);

	const changeRegion = (newRegion) => {
		setRegion(newRegion);
		setPrices([]);
	};
	if (prices.length === 0) {
		getData(region).then((newPrices) => setPrices(newPrices));
	}
	return (
		<div className="App">
			<button
				className="theme-toggle"
				id="themeToggle"
				aria-label="Toggle dark mode"
			>
				☀️
			</button>
			<header className="App-header">Switch sales</header>
			<select
				value={region}
				onChange={(event) => changeRegion(event.target.value)}
			>
				{Object.entries(REGIONS).map(([key, value]) => (
					<option value={value} key={key}>
						{value}
					</option>
				))}
			</select>
			<table>
				<thead>
					<tr>
						<th>Title</th>
						<th>Sale Price</th>
						<th>Normal Price</th>
						<th>Discount</th>
					</tr>
				</thead>
				<tbody>
					{prices.length > 0 ? (
						prices.map((entry) => (
							<GameEntry entry={entry} key={entry.title}></GameEntry>
						))
					) : (
						<tr>
							<td>Loading</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

export default App;
