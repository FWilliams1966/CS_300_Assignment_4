import { useState } from 'react'
import RatingStars from './rating.jsx'

function RatingDemoPage() {
	const [lastChange, setLastChange] = useState('No rating selected yet.')

	return (
		<main className="page-shell">
			<section className="hero-panel">
				<p className="hero-panel__eyebrow">React rating components</p>
				<h1>Interactive stars with persistent ratings</h1>
				<p className="hero-panel__copy">
					Configure the star count, seed an initial value, toggle read-only mode,
					and keep the user’s choice after refresh.
				</p>

				<div className="hero-panel__status">
					<span className="hero-panel__status-label">Latest change</span>
					<strong>{lastChange}</strong>
				</div>
			</section>

			<section className="rating-grid">
				<RatingStars
					totalStars={5}
					initialRatings={4}
					onRatingChange={(value) => setLastChange(`Interactive demo set to ${value} stars.`)}
					readOnly={false}
					label="Product experience"
				/>

				<RatingStars
					totalStars={10}
					initialRatings={8}
					onRatingChange={(value) => setLastChange(`Archived feedback set to ${value} stars.`)}
					readOnly={false}
					label="Archived feedback"
				/>
			</section>
		</main>
	)
}

export default RatingDemoPage