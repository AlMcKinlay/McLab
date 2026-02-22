import React from "react";
import styled from "styled-components";

const BingoCard = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
	grid-template-rows: 1fr 1fr 1fr 1fr 1fr;
	gap: 12px;
	width: 100%;
	height: 100%;

	& > div {
		display: grid;
		align-items: center;
		justify-items: center;
		overflow: hidden;
		border: 2px solid var(--border-primary);
		border-radius: 6px;
		background: var(--bg-card);
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 600;
		font-size: 0.95rem;
		text-align: center;
		word-break: break-word;
		min-height: 80px;
	}

	& > div:hover {
		border-color: var(--color-info);
		box-shadow: var(--shadow-lg);
		background: var(--bg-secondary);
	}
`;

const BingoPlaceholder = styled.div`
	display: grid;
	justify-items: center;
	align-items: center;
`;

const Wrapper = styled.div`
	display: grid;
`;

const Completed = styled.div`
	background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' preserveAspectRatio='none' viewBox='0 0 100 100'><path d='M100 0 L0 100 ' stroke='white' stroke-width='3'/><path d='M0 0 L100 100 ' stroke='white' stroke-width='3'/></svg>") !important;
	background-repeat: no-repeat;
	background-position: center center;
	background-size:
		100% 100%,
		auto;
	background-color: var(--color-success) !important;
	color: var(--text-contrast);
	border-color: var(--color-success-hover) !important;
`;

function Bingo({ args, completed, complete, clearChecked, needMore }) {
	let entries = [];
	if (args.length >= 24) {
		entries = args.slice(0, 24);
		entries.splice(12, 0, "Free space");
	}
	return (
		<Wrapper>
			{entries.length > 0 ? (
				<>
					<BingoCard>
						{entries.map((entry, index) =>
							completed[index] === true ? (
								<Completed key={index}>{entry}</Completed>
							) : (
								<div key={index} onClick={() => complete(index)}>
									<div>{entry}</div>
								</div>
							),
						)}
					</BingoCard>
					<button
						className="btn btn-secondary"
						onClick={clearChecked}
						style={{ marginTop: "1rem" }}
					>
						Clear Checked
					</button>
				</>
			) : (
				<BingoPlaceholder>
					{needMore ? (
						<div>You need more stuff</div>
					) : (
						<div>Press "Generate" to create</div>
					)}
				</BingoPlaceholder>
			)}
		</Wrapper>
	);
}

export default Bingo;
