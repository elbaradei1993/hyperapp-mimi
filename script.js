let tg = window.Telegram.WebApp;
let selectedVibe = '';
let nearbyReports = [];

function init() {
    if (tg) {
        tg.expand();
        tg.MainButton.hide();
        
        const user = tg.initDataUnsafe.user;
        if (user) {
            document.getElementById('username').textContent = user.first_name || 'User';
        }
        
        loadNearbyVibes();
    }
}

function loadNearbyVibes() {
    const vibesList = document.getElementById('nearbyVibes');
    vibesList.innerHTML = '<div class="loading">Loading nearby reports...</div>';
    
    // Simulate loading nearby reports
    setTimeout(() => {
        nearbyReports = [
            { id: 1, vibe: 'crowded', location: 'Downtown', notes: 'Busy but safe', votes: 5 },
            { id: 2, vibe: 'festive', location: 'Main Square', notes: 'Music festival', votes: 12 },
            { id: 3, vibe: 'calm', location: 'Park Area', notes: 'Quiet and peaceful', votes: 8 }
        ];
        
        displayNearbyVibes();
    }, 1000);
}

function displayNearbyVibes() {
    const vibesList = document.getElementById('nearbyVibes');
    vibesList.innerHTML = '';
    
    if (nearbyReports.length === 0) {
        vibesList.innerHTML = '<div class="loading">No reports nearby</div>';
        return;
    }
    
    nearbyReports.forEach(report => {
        const vibeItem = document.createElement('div');
        vibeItem.className = 'vibe-item';
        
        const vibeIcon = getVibeIcon(report.vibe);
        const vibeColor = getVibeColor(report.vibe);
        
        vibeItem.innerHTML = `
            <div class="vibe-info">
                <div style="color: ${vibeColor}; font-weight: 500;">
                    <i class="${vibeIcon}"></i> ${report.vibe.toUpperCase()}
                </div>
                <div style="font-size: 12px; color: #A0AEC0;">
                    ${report.location} • ${report.notes}
                </div>
                <div style="font-size: 11px; color: #6C757D;">
                    ${report.votes} votes
                </div>
            </div>
            <div class="vibe-actions">
                <button class="vote-btn upvote-btn" onclick="voteReport(${report.id}, 'upvote')">
                    <i class="fas fa-thumbs-up"></i>
                </button>
                <button class="vote-btn downvote-btn" onclick="voteReport(${report.id}, 'downvote')">
                    <i class="fas fa-thumbs-down"></i>
                </button>
            </div>
        `;
        
        vibesList.appendChild(vibeItem);
    });
}

function getVibeIcon(vibe) {
    const icons = {
        crowded: 'fas fa-users',
        noisy: 'fas fa-volume-up',
        festive: 'fas fa-music',
        calm: 'fas fa-peace',
        suspicious: 'fas fa-eye',
        dangerous: 'fas fa-exclamation-triangle'
    };
    return icons[vibe] || 'fas fa-question';
}

function getVibeColor(vibe) {
    const colors = {
        crowded: '#FFA500',
        noisy: '#FF6B35',
        festive: '#28A745',
        calm: '#17A2B8',
        suspicious: '#FFC107',
        dangerous: '#DC3545'
    };
    return colors[vibe] || '#6C757D';
}

function startReportFlow() {
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('reportView').classList.remove('hidden');
    selectedVibe = '';
}

function showMainView() {
    document.getElementById('mainView').classList.remove('hidden');
    document.getElementById('reportView').classList.add('hidden');
}

function selectVibe(vibe) {
    selectedVibe = vibe;
    document.querySelectorAll('.vibe-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

function submitVibeReport() {
    if (!selectedVibe) {
        alert('Please select a vibe type');
        return;
    }
    
    const notes = document.getElementById('vibeNotes').value;
    const reportData = {
        type: 'report',
        vibe: selectedVibe,
        notes: notes,
        timestamp: new Date().toISOString()
    };
    
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify(reportData));
        showTempMessage('Report submitted successfully!', 'success');
    } else {
        showTempMessage('Report would be sent: ' + JSON.stringify(reportData), 'info');
    }
    
    // Reset form and return to main view
    document.getElementById('vibeNotes').value = '';
    showMainView();
    loadNearbyVibes();
}

function voteReport(reportId, voteType) {
    const voteData = {
        type: 'vote',
        reportId: reportId,
        voteType: voteType
    };
    
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify(voteData));
        showTempMessage(`Voted ${voteType} on report #${reportId}`, 'success');
    } else {
        showTempMessage(`Would vote ${voteType} on report #${reportId}`, 'info');
    }
}

function reportEmergency() {
    selectedVibe = 'dangerous';
    const reportData = {
        type: 'report',
        vibe: 'dangerous',
        notes: 'EMERGENCY: Immediate attention required',
        emergency: true,
        timestamp: new Date().toISOString()
    };
    
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify(reportData));
        showTempMessage('Emergency report sent!', 'danger');
    } else {
        showTempMessage('Emergency report would be sent', 'danger');
    }
}

function openMap() {
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({ type: 'map' }));
    } else {
        showTempMessage('Map view requested', 'info');
    }
}

function showTopAreas() {
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({ type: 'topareas' }));
    } else {
        showTempMessage('Top areas requested', 'info');
    }
}

function showTempMessage(message, type) {
    // Simple message display implementation
    console.log(`${type}: ${message}`);
    alert(message);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);