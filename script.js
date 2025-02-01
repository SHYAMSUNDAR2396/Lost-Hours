let watchList = [];
        let searchTimeout = null;
        const API_KEY = '3532f94044da68fc54506d2dc13c2e38';
        const API_BASE_URL = 'https://api.themoviedb.org/3';
        const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w92';

        // Show toast message
        function showToast(message, duration = 3000) {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            toastMessage.textContent = message;
            toast.classList.add('active');
            setTimeout(() => {
                toast.classList.remove('active');
            }, duration);
        }

        // Load saved watch list
        function loadSavedList() {
            const saved = localStorage.getItem('watchList');
            if (saved) {
                watchList = JSON.parse(saved);
                updateWatchList();
            }
        }

        // Save watch list
        function saveList() {
            localStorage.setItem('watchList', JSON.stringify(watchList));
            updateStats();
        }
        // Update statistics
        function updateStats() {
            const totalShows = watchList.length;
            const totalEpisodes = watchList.reduce((sum, show) => sum + show.episodes, 0);
            const totalMinutes = watchList.reduce((sum, show) => sum + show.runtime, 0);
            const totalHours = (totalMinutes / 60).toFixed(1);

            document.getElementById('totalShows').textContent = totalShows;
            document.getElementById('totalEpisodes').textContent = totalEpisodes;
            document.getElementById('totalTime').textContent = `${totalHours} hours`;
        }

        // Search TV shows with debouncing
        function searchTVShow() {
            const query = document.getElementById('search').value;
            const resultsDiv = document.getElementById('results');
            const loadingDiv = document.getElementById('loading');
            const errorDiv = document.getElementById('error');

            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                resultsDiv.classList.remove('active');
                loadingDiv.classList.remove('active');
                errorDiv.classList.remove('active');
                return;
            }

            loadingDiv.classList.add('active');
            resultsDiv.classList.remove('active');
            errorDiv.classList.remove('active');

            searchTimeout = setTimeout(() => {
                fetch(`${API_BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`)
                    .then(response => {
                        if (!response.ok) throw new Error('Search failed');
                        return response.json();
                    })
                    .then(data => {
                        resultsDiv.innerHTML = '';
                        if (data.results.length === 0) {
                            errorDiv.textContent = 'No shows found';
                            errorDiv.classList.add('active');
                        } else {
                            data.results.forEach(show => {
                                const div = document.createElement('div');
                                div.className = 'result-item';
                                
                                const posterUrl = show.poster_path 
                                    ? `${POSTER_BASE_URL}${show.poster_path}`
                                    : '/api/placeholder/92/138';
                                
                                div.innerHTML = `
                                    <div class="poster">
                                        <img src="${posterUrl}" alt="${show.name}" onerror="this.src='/api/placeholder/92/138'">
                                    </div>
                                    <div class="show-info">
                                        <h3>${show.name}</h3>
                                        <p>${show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Unknown year'}</p>
                                    </div>
                                `;
                                div.onclick = () => fetchTotalRuntime(show.id, show.name, posterUrl);
                                resultsDiv.appendChild(div);
                            });
                            resultsDiv.classList.add('active');
                        }
                    })
                    .catch(error => {
                        errorDiv.textContent = 'Error searching shows. Please try again.';
                        errorDiv.classList.add('active');
                    })
                    .finally(() => {
                        loadingDiv.classList.remove('active');
                    });
            }, 500);
        }
        // Fetch show details and runtime
        function fetchTotalRuntime(id, title, posterUrl) {
            const loadingDiv = document.getElementById('loading');
            const errorDiv = document.getElementById('error');
            const resultsDiv = document.getElementById('results');

            loadingDiv.classList.add('active');
            errorDiv.classList.remove('active');
            resultsDiv.classList.remove('active');

            fetch(`${API_BASE_URL}/tv/${id}?api_key=${API_KEY}`)
                .then(response => {
                    if (!response.ok) throw new Error('Failed to fetch show details');
                    return response.json();
                })
                .then(data => {
                    // Get episode runtime
                    let episodeRuntime = 0;
                    if (data.episode_run_time && data.episode_run_time.length > 0) {
                        episodeRuntime = Math.round(
                            data.episode_run_time.reduce((a, b) => a + b, 0) / data.episode_run_time.length
                        );
                    }

                    // If no runtime found, estimate based on show type
                    if (episodeRuntime === 0) {
                        if (data.type === "Reality" || data.type === "Talk Show") {
                            episodeRuntime = 45;
                        } else if (data.type === "Animation") {
                            episodeRuntime = 25;
                        } else {
                            episodeRuntime = 45;
                        }
                    }

                    if (!data.seasons || data.seasons.length === 0) {
                        throw new Error('No season information available for this show');
                    }

                    showSeasonSelector(data, title, episodeRuntime, posterUrl);
                })
                .catch(error => {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.add('active');
                })
                .finally(() => {
                    loadingDiv.classList.remove('active');
                });
        }

        // Show season selector modal
        function showSeasonSelector(showData, title, episodeRuntime, posterUrl) {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            
            const seasons = showData.seasons.filter(season => season.season_number > 0); // Filter out specials
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Select Seasons Watched</h2>
                        <button class="btn-icon" onclick="closeModal(this)">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="season-list">
                            ${seasons.map(season => `
                                <div class="season-item">
                                    <label class="season-label">
                                        <input type="checkbox" 
                                            class="season-checkbox" 
                                            data-season="${season.season_number}"
                                            data-episodes="${season.episode_count}">
                                        <span class="season-name">Season ${season.season_number}</span>
                                        <span class="episode-count">${season.episode_count} episodes</span>
                                    </label>
                                    <div class="episode-input-container" style="display: none;">
                                        <input type="number" 
                                            class="episode-input" 
                                            min="0" 
                                            max="${season.episode_count}"
                                            value="${season.episode_count}"
                                            data-season="${season.season_number}">
                                        <span>episodes watched</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="closeModal(this.parentElement.parentElement.parentElement)">Cancel</button>
                        <button class="btn btn-primary" onclick="addShowWithSeasons('${title}', ${episodeRuntime}, '${posterUrl}', '${showData.status}')">Add to List</button>
                    </div>
                </div>
            `;

            // Add modal styles if not already present
            if (!document.getElementById('modal-styles')) {
                const styleSheet = document.createElement('style');
                styleSheet.id = 'modal-styles';
                styleSheet.textContent = `
                    .modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                    }
                    .modal-content {
                        background: white;
                        border-radius: var(--radius);
                        max-width: 500px;
                        width: 90%;
                        max-height: 90vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .modal-header {
                        padding: 1rem;
                        border-bottom: 1px solid var(--border);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .modal-body {
                        padding: 1rem;
                        overflow-y: auto;
                    }
                    .modal-footer {
                        padding: 1rem;
                        border-top: 1px solid var(--border);
                        display: flex;
                        justify-content: flex-end;
                        gap: 0.5rem;
                    }
                    .season-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .season-item {
                        padding: 0.5rem;
                        border: 1px solid var(--border);
                        border-radius: var(--radius);
                    }
                    .season-label {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        cursor: pointer;
                    }
                    .episode-count {
                        color: #64748b;
                        font-size: 0.875rem;
                        margin-left: auto;
                    }
                    .episode-input-container {
                        margin-top: 0.5rem;
                        padding-top: 0.5rem;
                        border-top: 1px dashed var(--border);
                    }
                    .episode-input {
                        width: 80px;
                        padding: 0.25rem;
                        margin-right: 0.5rem;
                    }
                `;
                document.head.appendChild(styleSheet);
            }

            document.body.appendChild(modal);

            // Add event listeners for season checkboxes
            modal.querySelectorAll('.season-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const container = e.target.closest('.season-item').querySelector('.episode-input-container');
                    container.style.display = e.target.checked ? 'block' : 'none';
                });
            });
        }

        // Close modal
        function closeModal(element) {
            const modal = element.closest('.modal');
            modal.remove();
        }

        // Add show with selected seasons
        function addShowWithSeasons(title, episodeRuntime, posterUrl, status) {
            const modal = document.querySelector('.modal');
            const selectedSeasons = Array.from(modal.querySelectorAll('.season-checkbox:checked')).map(checkbox => {
                const seasonNumber = checkbox.dataset.season;
                const episodeInput = modal.querySelector(`.episode-input[data-season="${seasonNumber}"]`);
                return {
                    season: parseInt(seasonNumber),
                    totalEpisodes: parseInt(checkbox.dataset.episodes),
                    watchedEpisodes: parseInt(episodeInput.value)
                };
            });

            if (selectedSeasons.length === 0) {
                showToast('Please select at least one season');
                return;
            }

            const totalWatchedEpisodes = selectedSeasons.reduce((sum, season) => sum + season.watchedEpisodes, 0);
            const totalRuntime = totalWatchedEpisodes * episodeRuntime;

            addToList(
                title,
                totalRuntime,
                totalWatchedEpisodes,
                episodeRuntime,
                posterUrl,
                status,
                selectedSeasons
            );

            closeModal(modal);
            document.getElementById('search').value = '';
            showToast(`Added "${title}" with ${totalWatchedEpisodes} episodes to your watch list`);
        }

        // Modify addToList function to include seasons
        function addToList(title, runtime, episodes, episodeRuntime, posterUrl, status, seasons) {
            if (!watchList.some(item => item.title === title)) {
                watchList.push({ 
                    title, 
                    runtime, 
                    episodes, 
                    episodeRuntime,
                    posterUrl,
                    status,
                    seasons,
                    addedAt: new Date().toISOString()
                });
                updateWatchList();
                saveList();
            }
        }

        // Update the watch list display function to show season information
        function updateWatchList() {
            const listDiv = document.getElementById('watchList');
            listDiv.innerHTML = '';

            if (watchList.length === 0) {
                listDiv.innerHTML = `
                    <div class="empty-state">
                        <p>Your watch list is empty</p>
                        <p>Search for TV shows to add them to your list</p>
                    </div>
                `;
                return;
            }

            watchList.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'watch-item';
                
                const seasonsText = item.seasons
                    ? `<p style="color: #64748b; font-size: 0.875rem;">Watched: ${item.seasons.map(s => 
                        `S${s.season} (${s.watchedEpisodes}/${s.totalEpisodes} eps)`).join(', ')}</p>`
                    : '';
                
                div.innerHTML = `
                    <div class="show-details">
                        <h3>${item.title}</h3>
                        <p>${item.episodes} episodes × ${item.episodeRuntime} min = ${formatDuration(item.runtime)}</p>
                        ${seasonsText}
                        <p style="color: #64748b; font-size: 0.75rem;">Status: ${item.status}</p>
                    </div>
                    <div class="actions">
                        <button class="btn-icon" onclick="removeFromList(${index})" title="Remove from list">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                `;
                
                listDiv.appendChild(div);
            });
            
            updateStats();
        }


        // Add show to watch list
        function addToList(title, runtime, episodes, episodeRuntime, posterUrl, status) {
            if (!watchList.some(item => item.title === title)) {
                watchList.push({ 
                    title, 
                    runtime, 
                    episodes, 
                    episodeRuntime,
                    posterUrl,
                    status,
                    addedAt: new Date().toISOString()
                });
                updateWatchList();
                saveList();
            }
        }

        // Remove show from watch list
        function removeFromList(index) {
            const show = watchList[index];
            watchList.splice(index, 1);
            updateWatchList();
            saveList();
            showToast(`Removed "${show.title}" from your watch list`);
        }

        // Clear entire watch list
        function clearList() {
            if (watchList.length === 0) return;
            
            if (confirm('Are you sure you want to clear your watch list?')) {
                watchList = [];
                updateWatchList();
                saveList();
                showToast('Watch list cleared');
            }
        }

        // Format duration
        function formatDuration(minutes) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }

        // Update watch list display
        function updateWatchList() {
            const listDiv = document.getElementById('watchList');
            listDiv.innerHTML = '';

            if (watchList.length === 0) {
                listDiv.innerHTML = `
                    <div class="empty-state">
                        <p>Your watch list is empty</p>
                        <p>Search for TV shows to add them to your list</p>
                    </div>
                `;
                return;
            }

            watchList.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'watch-item';
                
                div.innerHTML = `
                    <div class="show-details">
                        <h3>${item.title}</h3>
                        <p>${item.episodes} episodes × ${item.episodeRuntime} min = ${formatDuration(item.runtime)}</p>
                        <p style="color: #64748b; font-size: 0.75rem;">Status: ${item.status}</p>
                    </div>
                    <div class="actions">
                        <button class="btn-icon" onclick="removeFromList(${index})" title="Remove from list">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                `;
                
                listDiv.appendChild(div);
            });
            
            updateStats();
        }

        // Set up event listeners
        document.getElementById('search').addEventListener('input', searchTVShow);
        document.addEventListener('click', (e) => {
            const results = document.getElementById('results');
            const searchContainer = document.querySelector('.search-container');
            if (!searchContainer.contains(e.target)) {
                results.classList.remove('active');
            }
        });

        // Load saved list on page load
        loadSavedList();