import { elements } from '../ui.js';

export function renderAboutView() {
    if (!elements.aboutContent) return;

    elements.aboutContent.innerHTML = `
        <div class="about-page-wrapper cyber-theme">
                    
            <div class="about-header-block">
                <h1 class="logo">::twenty</h1>
                <p class="about-subtitle">An AI-powered deduction game!</p>
                <p class="about-author-tag">Made by <span class="author-highlight">Roy Kawaguchi & Hayate Okuma</span></p>
            </div>
            
            <hr class="cyber-divider">

            <div class="about-section concept-section">
                <p>Welcome to <strong>::twenty</strong>! </p>
                <p>
                    <strong>::twenty</strong> is an AI-powered guessing game. Your goal is to figure out the secret answer in <strong>20 turns or less</strong>. 
                    You can only ask Yes or No questions! How fast can you figure it out??
                </p>
            </div>

            <div class="about-grid">
                
                <div class="about-card rules-card">
                    <h2><span class="icon-tag">⚙️</span> How It Works</h2>
                    <ul>
                        <li><strong>20 Turns:</strong> Every game gives you up to <strong>20 total turns</strong>.</li>
                        <li><strong>Questions & Guesses:</strong> Asking a question or making a guess both use <strong>1 turn</strong>.</li>
                        <li><strong>One Last Guess:</strong> If your 20th turn is a question, you'll still get <strong>one final guess</strong> for free!</li>
                        <li><strong>Guess Freely:</strong> Wrong guesses don't have any extra penalty, so don't be afraid to try!</li>
                    </ul>
                </div>

                <div class="about-card multiplayer-card">
                    <h2><span class="icon-tag">⚔️</span> Multiplayer</h2>
                    <p>Challenge a friend in a turn-based match!</p>
                    <ul>
                        <li><strong>Take Turns:</strong> Players alternate asking questions and making guesses.</li>
                        <li><strong>Be First:</strong> The first player to guess the correct answer wins instantly!</li>
                    </ul>

                    <div class="intel-alert-box warning-box">
                        <strong>⚠️ Don't Leave!</strong> If you close the tab or disconnect during a match, you'll automatically forfeit and your opponent wins.
                    </div>

                    <div class="intel-alert-box tip-box">
                        <strong>💡 Tip:</strong> Be careful how many questions you ask! Your opponent can see the AI's answers too, so sometimes making an early guess is the better move.
                    </div>
                </div>

                <div class="about-card ai-card">
                    <h2><span class="icon-tag">🧠</span> About the AI</h2>

                    <p>The AI understands different ways of saying the same thing. For example, typing <strong>"cr7"</strong> will correctly match <strong>"Cristiano Ronaldo"</strong>.</p>

                    <p><strong>Analysis Mode:</strong> Curious how the AI reached its answer? After the game ends, you can open <strong>Analysis Mode</strong> to see the AI's reasoning.</p>

                    <p><strong>Found a Bug?</strong> If something seems wrong and the analysis doesn't explain it, head to the <strong>Contact Us</strong> page and let us know!</p>
                </div>

                <div class="about-card progression-card">
                    <h2><span class="icon-tag">📊</span> XP & Leaderboard</h2>
                    <ul>
                        <li><strong>Earn XP:</strong> Winning games gives you XP. The faster you solve the answer, the more XP you'll earn!</li>
                        <li><strong>Just for Fun:</strong> XP is used to track your progress and show off your profile.</li>
                        <li><strong>Leaderboard:</strong> Rankings aren't based on total XP. Instead, they're based on your <strong>average number of turns</strong>, so playing consistently well matters most!</li>
                    </ul>
                </div>
            </div>

            <div class="about-creators-section">
                <h2><span class="icon-tag">💻</span> Meet the Developers</h2>

                <p>::twenty was designed, built, and deployed by Computer Science students at <strong>Temple University Japan Campus (TUJ)</strong>.</p>
                
                <div class="tech-tags-container">
                    <span class="tech-badge">Python (Flask)</span>
                    <span class="tech-badge">Socket.IO</span>
                    <span class="tech-badge">MongoDB</span>
                    <span class="tech-badge">Vanilla JavaScript</span>
                    <span class="tech-badge">JWT Authentication</span>
                </div>

                <div class="developer-profiles-grid">
                    <div class="profile-card">
                        <h3>Roy Kawaguchi</h3>
                        <p class="profile-role">Backend Developer</p>
                        <a href="https://github.com/RoyKawaguchi" target="_blank" class="dev-link-btn">📁 GitHub</a>
                    </div>

                    <div class="profile-card">
                        <h3>Hayate Okuma</h3>
                        <p class="profile-role">Systems & Integration</p>
                        <a href="#" target="_blank" class="dev-link-btn disabled-btn">📁 Profile</a>
                    </div>
                </div>
            </div>
            
        </div>
    `;
}