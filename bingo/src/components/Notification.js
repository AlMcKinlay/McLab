import React from "react";
import styled from "styled-components";

const NotificationContainer = styled.div`
	position: fixed;
	top: 2rem;
	left: 50%;
	transform: translateX(-50%);
	background-color: ${(props) =>
		props.$isError ? "var(--color-danger)" : "var(--color-success)"};
	color: var(--text-contrast);
	padding: 1rem 1.5rem;
	border-radius: 8px;
	box-shadow: var(--shadow-lg);
	z-index: 1000;
	animation: slideDown 0.3s ease-out;
`;

function Notification({ message, type = "success" }) {
	if (!message) return null;
	return (
		<NotificationContainer $isError={type === "error"}>
			{message}
		</NotificationContainer>
	);
}

export default Notification;
