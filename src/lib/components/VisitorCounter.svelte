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

<div class="visitor-counter">
	<div class="stats-container">
		<div class="stat-card" class:animate={animateCount}>
			<div class="stat-icon">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
					<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM7 12a5 5 0 1110 0 5 5 0 01-10 0z" clip-rule="evenodd" />
				</svg>
			</div>
			<div class="stat-content">
				<p class="stat-label">Total Visitors in This Application</p>
				{#if isLoading}
					<p class="stat-value loading-skeleton"></p>
				{:else}
					<p class="stat-value">{totalUniqueVisitors.toLocaleString()}</p>
				{/if}
			</div>
		</div>

		<!-- Only showing total visitors, today's removed -->
	</div>
</div>

<style>
	.visitor-counter {
		width: 100%;
		padding: 0;
		background: transparent;
	}

	.stats-container {
		max-width: 350px;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 1rem 1.25rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(11, 45, 86, 0.08);
		transition: all 0.3s ease;
		border: 1px solid rgba(244, 197, 66, 0.1);
	}

	.stat-card:hover {
		box-shadow: 0 8px 24px rgba(11, 45, 86, 0.12);
		transform: translateY(-2px);
		border-color: rgba(244, 197, 66, 0.3);
	}

	.stat-card.animate {
		animation: slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.stat-icon {
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #0b2d56 0%, #1e3a66 100%);
		border-radius: 12px;
		flex-shrink: 0;
		color: white;
	}

	.stat-icon svg {
		width: 28px;
		height: 28px;
	}

	.stat-content {
		flex: 1;
	}

	.stat-label {
		margin: 0;
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		margin: 0.25rem 0 0 0;
		font-size: 1.75rem;
		font-weight: 800;
		color: #0b2d56;
		letter-spacing: -1px;
	}

	.loading-skeleton {
		background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		height: 2rem;
		border-radius: 6px;
	}

	@keyframes loading {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	@media (max-width: 768px) {
		.visitor-counter {
			padding: 1.5rem 0;
		}

		.stats-container {
			gap: 1rem;
		}

		.stat-card {
			gap: 1rem;
			padding: 1.25rem;
		}

		.stat-icon {
			width: 50px;
			height: 50px;
		}

		.stat-icon svg {
			width: 28px;
			height: 28px;
		}

		.stat-value {
			font-size: 1.5rem;
		}
	}
</style>