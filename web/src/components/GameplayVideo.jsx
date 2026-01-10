import './GameplayVideo.css'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

function GameplayVideo() {
  const [ref, isVisible] = useScrollAnimation()
  
  return (
    <section className="gameplay-video section">
      <div className="container">
        <div className="video-section-header">
          <h2 className="video-title">See It In Action</h2>
          <p className="video-subtitle">Watch how strategy and economy collide</p>
        </div>
        <div className={`video-container ${isVisible ? 'fade-in' : ''}`} ref={ref}>
          <div className="video-wrapper">
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/1G0z3WC2WWA?si=2JM06q7pgBqiiBLH"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="youtube-embed"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GameplayVideo
