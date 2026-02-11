import FluidGlass from './components/FluidGlass'
import './App.css'

function App() {
  const content = {
    title: '🐱 Happy Promise Day 🐱',
    subtitle: 'For the one who loves cats',
    message: 'No promises today...',
    bottomText: 'Just cats, peace & good vibes ✨'
  }

  return (
    <div className="app-container">
      <FluidGlass 
        mode="lens"
        lensProps={{
          scale: 0.25,
          ior: 1.2,
          thickness: 3,
          chromaticAberration: 0.15,
          anisotropy: 0.02,
          transmission: 1,
          roughness: 0
        }}
        content={content}
      />
      
      {/* Floating hearts decoration */}
      <div className="floating-elements">
        <span className="heart" style={{ '--delay': '0s', '--x': '10%' }}>💕</span>
        <span className="heart" style={{ '--delay': '2s', '--x': '25%' }}>🐱</span>
        <span className="heart" style={{ '--delay': '4s', '--x': '40%' }}>💖</span>
        <span className="heart" style={{ '--delay': '1s', '--x': '60%' }}>🐾</span>
        <span className="heart" style={{ '--delay': '3s', '--x': '75%' }}>💕</span>
        <span className="heart" style={{ '--delay': '5s', '--x': '90%' }}>🐱</span>
      </div>
    </div>
  )
}

export default App
