import React from "react";

export default function GameEntry({ entry }) {
	return (
		<tr>
			<td>
				{entry.url ? (
					<a href={entry.url} target="_blank" rel="noopener noreferrer">
						{entry.title}
					</a>
				) : (
					entry.title
				)}
			</td>
			<td>{entry.price.toFixed(2)}</td>
			<td>{entry.original.toFixed(2)}</td>
			<td>{Math.round(entry.discount)}%</td>
		</tr>
	);
}
