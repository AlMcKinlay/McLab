import { useMemo, useState } from "react";
import "./App.css";

const BOARD_SIZE = 3;
const BULLET_DURATION_MS = 650;

const WINNING_LINES = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6],
];

const INITIAL_BULLETS = {
	topLeft: {
		id: "topLeft",
		row: 0,
		col: 0,
		direction: "left",
		active: true,
	},
	bottomRight: {
		id: "bottomRight",
		row: 2,
		col: 2,
		direction: "right",
		active: true,
	},
};

const evaluateBoard = (board) => {
	for (const [a, b, c] of WINNING_LINES) {
		if (board[a] && board[a] === board[b] && board[a] === board[c]) {
			return { winner: board[a], winningLine: [a, b, c], draw: false };
		}
	}

	const isDraw = board.every((cell) => Boolean(cell));
	return { winner: null, winningLine: [], draw: isDraw };
};

function App() {
	const [board, setBoard] = useState(Array(9).fill(null));
	const [currentPlayer, setCurrentPlayer] = useState("X");
	const [winner, setWinner] = useState(null);
	const [winningLine, setWinningLine] = useState([]);
	const [isDraw, setIsDraw] = useState(false);
	const [bullets, setBullets] = useState(INITIAL_BULLETS);
	const [projectile, setProjectile] = useState(null);

	const activeBulletCorners = useMemo(() => {
		const cornerMap = new Set();
		Object.values(bullets).forEach((bullet) => {
			if (!bullet.active) {
				return;
			}
			cornerMap.add(bullet.row * BOARD_SIZE + bullet.col);
		});
		return cornerMap;
	}, [bullets]);

	const updateGameStateFromBoard = (nextBoard) => {
		const nextState = evaluateBoard(nextBoard);
		setWinner(nextState.winner);
		setWinningLine(nextState.winningLine);
		setIsDraw(nextState.draw);

		if (!nextState.winner && !nextState.draw) {
			setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
		}
	};

	const handleCellClick = (index) => {
		if (winner || isDraw || projectile) {
			return;
		}

		if (board[index] || activeBulletCorners.has(index)) {
			return;
		}

		const nextBoard = [...board];
		nextBoard[index] = currentPlayer;
		setBoard(nextBoard);
		updateGameStateFromBoard(nextBoard);
	};

	const fireBullet = (bulletId) => {
		const bullet = bullets[bulletId];
		if (!bullet?.active || projectile) {
			return;
		}

		const nextBoard = [...board];
		const rowStart = bullet.row * BOARD_SIZE;
		for (let i = 0; i < BOARD_SIZE; i += 1) {
			nextBoard[rowStart + i] = null;
		}

		setBoard(nextBoard);
		updateGameStateFromBoard(nextBoard);

		setProjectile({
			key: `${bullet.id}-${Date.now()}`,
			row: bullet.row,
			col: bullet.col,
			direction: bullet.direction,
		});

		setBullets((prev) => ({
			...prev,
			[bulletId]: {
				...prev[bulletId],
				active: false,
			},
		}));

		setTimeout(() => {
			setProjectile(null);
		}, BULLET_DURATION_MS);
	};

	const handleReset = () => {
		setBoard(Array(9).fill(null));
		setCurrentPlayer("X");
		setWinner(null);
		setWinningLine([]);
		setIsDraw(false);
		setBullets(INITIAL_BULLETS);
		setProjectile(null);
	};

	const statusMessage = winner
		? `Winner: ${winner}`
		: isDraw
			? "Draw"
			: `Current player: ${currentPlayer}`;

	return (
		<div className="tic-app">
			<button
				className="theme-toggle"
				id="themeToggle"
				aria-label="Toggle dark mode"
			>
				☀️
			</button>
			<header className="tic-header">
				<h1>Tic Tac Toe: Bullet Bill</h1>
				<p className="tic-subtitle">
					Click a Bullet Bill corner to wipe its full row and blast off-screen.
				</p>
			</header>

			<main className="tic-main">
				<div className="tic-panel">
					<div className="tic-status">{statusMessage}</div>
					<div className="tic-board" role="grid" aria-label="Tic tac toe board">
						{board.map((cell, index) => {
							const isWinningCell = winningLine.includes(index);
							const hasBullet = Object.values(bullets).find(
								(bullet) =>
									bullet.active &&
									bullet.row * BOARD_SIZE + bullet.col === index,
							);

							const isDisabled =
								Boolean(cell) || winner || isDraw || Boolean(projectile);

							const triggerCellAction = () => {
								if (isDisabled) {
									return;
								}

								if (hasBullet) {
									fireBullet(hasBullet.id);
									return;
								}

								handleCellClick(index);
							};

							return (
								<div
									key={index}
									role="button"
									tabIndex={isDisabled ? -1 : 0}
									className={`tic-cell ${isWinningCell ? "winning" : ""} ${isDisabled ? "disabled" : ""}`}
									onClick={triggerCellAction}
									onKeyDown={(event) => {
										if (
											!isDisabled &&
											(event.key === "Enter" || event.key === " ")
										) {
											event.preventDefault();
											triggerCellAction();
										}
									}}
								>
									<span>{cell}</span>
									{hasBullet ? (
										<div className={`bullet-corner ${hasBullet.direction}`}>
											<img
												className="bullet-image"
												src={`${process.env.PUBLIC_URL}/bullet-bill.png`}
												alt=""
												aria-hidden="true"
											/>
										</div>
									) : null}
								</div>
							);
						})}

						{projectile ? (
							<div
								key={projectile.key}
								className={`bullet-projectile ${projectile.direction}`}
								style={{
									"--bullet-row": projectile.row,
									"--bullet-col": projectile.col,
								}}
							>
								<img
									className="bullet-image"
									src={`${process.env.PUBLIC_URL}/bullet-bill.png`}
									alt=""
									aria-hidden="true"
								/>
							</div>
						) : null}
					</div>

					<div className="tic-actions">
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleReset}
						>
							Reset game
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}

export default App;
