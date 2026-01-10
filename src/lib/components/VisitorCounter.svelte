<script lang="ts">
	import { onMount } from 'svelte';
	import { 
		getUniqueVisitorCount, 
		trackPageVisit 
	} from '$lib/services/visitorService';

	let totalUniqueVisitors = 0;
	let isLoading = true;
	let animateCount = false;

	onMount(async () => {
		try {
			// Track this page visit
			await trackPageVisit(window.location.pathname);
			
			// Get total visitor count
			const total = await getUniqueVisitorCount();
			totalUniqueVisitors = total;
			
			// Trigger animation
			setTimeout(() => {
				animateCount = true;
			}, 300);
		} catch (error) {
			console.error('Error loading visitor stats:', error);
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="visitor-counter" class:animate={animateCount}>
	<div class="counter-badge">
		<div class="icon-wrapper">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
				<circle cx="9" cy="7" r="4"/>
				<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
				<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
			</svg>
		</div>
		<div class="counter-content">
			<span class="counter-label">Total Visitors <span class="app-text">in This Application</span></span>
			<div class="counter-number">
				{#if isLoading}
					<div class="loading-dots">
						<span></span><span></span><span></span>
					</div>
				{:else}
					<span class="number">{totalUniqueVisitors.toLocaleString()}</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.visitor-counter {
		width: 100%;
		max-width: 380px;
		opacity: 0;
		transform: scale(0.95);
	}

	.visitor-counter.animate {
		animation: fadeInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	@keyframes fadeInScale {
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.counter-badge {
		background: linear-gradient(135deg, #0b2d56 0%, #1e3a66 100%);
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 8px 32px rgba(11, 45, 86, 0.25);
		display: flex;
		align-items: center;
		gap: 1.25rem;
		position: relative;
		overflow: hidden;
		transition: all 0.3s ease;
		border: 2px solid rgba(244, 197, 66, 0.2);
	}

	.counter-badge::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(circle at top right, rgba(244, 197, 66, 0.15), transparent 60%);
		pointer-events: none;
	}

	.counter-badge:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 48px rgba(11, 45, 86, 0.35);
		border-color: rgba(244, 197, 66, 0.4);
	}

	.icon-wrapper {
		width: 60px;
		height: 60px;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.icon-wrapper svg {
		width: 32px;
		height: 32px;
		color: #F4C542;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
	}

	.counter-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.counter-label {
		font-size: 0.813rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		text-transform: uppercase;
		letter-spacing: 0.8px;
		line-height: 1.3;
	}

	.app-text {
		display: block;
		font-size: 0.688rem;
		opacity: 0.8;
		letter-spacing: 0.5px;
		margin-top: 2px;
	}

	.counter-number {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.number {
		font-size: 2.25rem;
		font-weight: 800;
		color: #F4C542;
		line-height: 1;
		letter-spacing: -1.5px;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.loading-dots {
		display: flex;
		gap: 6px;
		align-items: center;
		height: 2.25rem;
	}

	.loading-dots span {
		width: 10px;
		height: 10px;
		background: #F4C542;
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out both;
	}

	.loading-dots span:nth-child(1) {
		animation-delay: -0.32s;
	}

	.loading-dots span:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes bounce {
		0%, 80%, 100% {
			transform: scale(0);
			opacity: 0.5;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	@media (max-width: 768px) {
		.visitor-counter {
			max-width: calc(100% - 2rem);
			margin: 0 auto;
			padding: 0 1rem;
		}

		.counter-badge {
			padding: 1rem 1.25rem;
			gap: 0.875rem;
			margin: 0 auto;
			width: 100%;
			box-sizing: border-box;
		}

		.icon-wrapper {
			width: 48px;
			height: 48px;
		}

		.icon-wrapper svg {
			width: 24px;
			height: 24px;
		}

		.counter-label {
			font-size: 0.813rem;
		}

		.app-text {
			font-size: 0.688rem;
		}

		.number {
			font-size: 1.875rem;
		}
	}
</style>