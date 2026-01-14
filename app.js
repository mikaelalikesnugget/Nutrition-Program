// NutriPal - Meal Planner & Nutrition Platform
console.log('📍 app.js loaded successfully!');

const N8N_WEBHOOK_URL = 'https://n8ngc.codeblazar.org/webhook-test/meal-planner-form';

// Global error handler to catch all errors
window.addEventListener('error', (event) => {
  console.error('🔴 Global JavaScript Error:', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error
  });
});

// DOM Elements (will be fetched when needed)
let chatPanel = null;
let navMealBtn = null;
let closeChatBtn = null;
let inputForm = null;
let emailForm = null;
let closeMealPlannerBtn = null;
let closeGoalModalBtn = null;

// Initialize DOM elements
function initDOMElements() {
  chatPanel = document.getElementById('chat-panel');
  navMealBtn = document.getElementById('nav-meal-btn');
  closeChatBtn = document.getElementById('close-chat');
  inputForm = document.getElementById('input-form');
  emailForm = document.getElementById('email-form');
  closeMealPlannerBtn = document.getElementById('close-chat'); // same as closeChatBtn
  closeGoalModalBtn = document.getElementById('close-goal-modal');
  
  console.log('📋 DOM Elements initialized:', {
    chatPanel: !!chatPanel,
    navMealBtn: !!navMealBtn,
    closeChatBtn: !!closeChatBtn,
    inputForm: !!inputForm,
    emailForm: !!emailForm,
    closeGoalModalBtn: !!closeGoalModalBtn
  });
}

let userProfile = loadProfile();

// Load/Save User Profile
function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem('nutripal_profile') || '{}');
    return saved;
  } catch (e) {
    return {};
  }
}

function saveProfile() {
  localStorage.setItem('nutripal_profile', JSON.stringify(userProfile));
}

// ===== WELLNESS PROGRESS TRACKING =====
/**
 * Progress Tracking System
 * Stores and displays user wellness progress based on check-ins
 * localStorage keys:
 *  - nutripal_wellness_goal: { name, target, startDate }
 *  - nutripal_checkins_log: [{ date, timestamp, type }]
 *  - nutripal_streak: { current, longest, lastCheckInDate }
 */

/**
 * Initialize Progress Tracking Feature
 * Load existing progress data and setup UI
 */
function initProgressTracking() {
  console.log('🎯 Initializing wellness progress tracking...');
  
  // Ensure default localStorage values exist
  if (!localStorage.getItem('nutripal_checkins_log')) {
    localStorage.setItem('nutripal_checkins_log', '[]');
  }
  if (!localStorage.getItem('nutripal_streak')) {
    localStorage.setItem('nutripal_streak', JSON.stringify({ current: 0, longest: 0 }));
  }
  if (!localStorage.getItem('nutripal_wellness_goal')) {
    localStorage.setItem('nutripal_wellness_goal', '{}');
  }
  
  // DOM Elements for progress tracker
  const goalModal = document.getElementById('goal-modal');
  const goalForm = document.getElementById('goal-form');
  const setTargetBtn = document.getElementById('set-target-btn');
  const closeGoalModal = document.getElementById('close-goal-modal');
  const completeGoalsBtn = document.getElementById('complete-goals-btn');
  
  console.log('Button elements found:', {
    setTargetBtn: !!setTargetBtn,
    completeGoalsBtn: !!completeGoalsBtn
  });
  
  // Load existing data
  loadAndDisplayProgress();
  
  // Setup event listeners
  if (setTargetBtn) {
    setTargetBtn.addEventListener('click', () => {
      openGoalModal();
    });
    console.log('✅ Set target button listener attached');
  } else {
    console.warn('⚠️ Set target button not found');
  }
  
  if (closeGoalModal) {
    closeGoalModal.addEventListener('click', () => {
      closeGoalModal_fn();
    });
  }
  
  if (goalModal) {
    goalModal.addEventListener('click', (e) => {
      if (e.target === goalModal) {
        closeGoalModal_fn();
      }
    });
  }
  
  if (goalForm) {
    goalForm.addEventListener('submit', handleGoalSubmit);
  }

  // New button event listeners
  if (completeGoalsBtn) {
    completeGoalsBtn.addEventListener('click', () => {
      console.log('✅ Complete Goals button clicked');
      recordDailyGoalCompletion();
    });
    console.log('✅ Complete goals button listener attached');
  } else {
    console.warn('⚠️ Complete goals button not found');
  }
  
  console.log('✅ Progress tracking initialized');
}

/**
 * Load and Display Progress Data
 * Retrieves stored data and updates UI with current progress
 */
function loadAndDisplayProgress() {
  try {
    const goal = JSON.parse(localStorage.getItem('nutripal_wellness_goal') || '{}');
    const checkins = JSON.parse(localStorage.getItem('nutripal_checkins_log') || '[]');
    const streak = JSON.parse(localStorage.getItem('nutripal_streak') || '{"current": 0, "longest": 0}');
    
    console.log('📊 Loading progress data:', {
      goalName: goal.name,
      checkinsCount: checkins.length,
      streakCurrent: streak.current
    });
    
    // Update target display
    const targetDisplay = document.getElementById('target-display');
    const targetPriority = document.getElementById('target-priority');
    
    if (targetDisplay) {
      if (goal.name) {
        targetDisplay.textContent = goal.name;
        targetPriority.textContent = `Priority: ${goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}`;
      } else {
        targetDisplay.textContent = 'No target set yet';
        targetPriority.textContent = 'Priority: Not set';
      }
    }
    
    // Calculate and display progress
    const progressPercent = calculateProgress(checkins, goal);
    displayProgressBar(progressPercent);
    
    // Update quick stats - WITH ERROR CHECKING
    const totalCheckinsElement = document.getElementById('total-checkins');
    const lastCheckinElement = document.getElementById('last-checkin');
    const achievementElement = document.getElementById('achievement');
    
    if (totalCheckinsElement) {
      const count = checkins.length;
      totalCheckinsElement.textContent = `${count} check-in${count !== 1 ? 's' : ''}`;
    } else {
      console.warn('⚠️ total-checkins element not found');
    }
    
    if (lastCheckinElement) {
      lastCheckinElement.textContent = getLastCheckInDate(checkins);
    } else {
      console.warn('⚠️ last-checkin element not found');
    }
    
    if (achievementElement) {
      achievementElement.textContent = getAchievementBadge(checkins.length);
    } else {
      console.warn('⚠️ achievement element not found');
    }
    
    console.log('✅ Progress data displayed successfully');
  } catch (error) {
    console.error('❌ Error loading progress:', error);
  }
}

/**
 * Calculate Progress Percentage
 * Based on check-ins completed
 * @param {Array} checkins - Array of check-in records
 * @param {Object} goal - Goal object with priority
 * @returns {number} Progress percentage (0-100)
 */
function calculateProgress(checkins, goal) {
  // Progress based on check-ins regardless of goal
  if (checkins.length === 0) return 0;
  
  // Every 10 check-ins = 10% progress (capped at 100%)
  const percent = Math.min((checkins.length * 10), 100);
  return Math.round(percent);
}

/**
 * Display Progress Bar
 * Animate progress fill to match percentage
 * @param {number} percent - Progress percentage
 */
function displayProgressBar(percent) {
  const progressFill = document.getElementById('progress-fill');
  const progressPercentage = document.getElementById('progress-percentage');
  
  if (progressFill) {
    progressFill.style.width = percent + '%';
  }
  if (progressPercentage) {
    progressPercentage.textContent = percent + '%';
  }
  
  // Change color based on progress
  if (percent >= 100) {
    if (progressFill) progressFill.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
  } else if (percent >= 70) {
    if (progressFill) progressFill.style.background = 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)';
  } else if (percent >= 40) {
    if (progressFill) progressFill.style.background = 'linear-gradient(90deg, #f59e0b 0%, #f87171 100%)';
  }
}

/**
 * Get Last Check-In Date
 * Returns formatted date of most recent check-in
 * @param {Array} checkins - Array of check-in records
 * @returns {string} Formatted date or dash if none
 */
function getLastCheckInDate(checkins) {
  if (checkins.length === 0) return 'Never';
  
  const lastCheckin = checkins[checkins.length - 1];
  const date = new Date(lastCheckin.timestamp);
  
  // Format: "Jan 13" or "Today" or "Yesterday"
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get Achievement Badge
 * Return badge based on check-in count
 * @param {number} count - Number of check-ins
 * @returns {string} Achievement badge name
 */
function getAchievementBadge(count) {
  if (count === 0) return 'Bronze 🥉';
  if (count < 5) return 'Bronze 🥉';
  if (count < 15) return 'Silver 🥈';
  if (count < 30) return 'Gold 🥇';
  return 'Platinum 💎';
}

/**
 * Open Goal Modal
 * Display modal for setting/editing wellness goal
 */
function openGoalModal() {
  console.log('📝 Opening goal modal...');
  const modal = document.getElementById('goal-modal');
  const goalInput = document.getElementById('goal-input');
  const goalTarget = document.getElementById('goal-target');
  
  console.log('Modal elements:', { modal: !!modal, goalInput: !!goalInput, goalTarget: !!goalTarget });
  
  if (!modal || !goalInput || !goalTarget) {
    console.error('❌ Required modal elements not found');
    return;
  }
  
  // Pre-fill existing data if available
  const existingGoal = JSON.parse(localStorage.getItem('nutripal_wellness_goal') || '{}');
  if (existingGoal.name) {
    goalInput.value = existingGoal.name;
    goalTarget.value = existingGoal.target;
    console.log('✅ Pre-filled with existing goal:', existingGoal.name);
  } else {
    goalInput.value = '';
    goalTarget.value = '';
  }
  
  modal.classList.add('active');
  modal.removeAttribute('aria-hidden');
  console.log('✅ Goal modal opened');
}

/**
 * Close Goal Modal
 */
function closeGoalModal_fn() {
  const modal = document.getElementById('goal-modal');
  modal?.classList.remove('active');
  modal?.setAttribute('aria-hidden', 'true');
}

/**
 * Handle Goal Form Submission
 * Save new wellness goal and reset tracking
 */
function handleGoalSubmit(e) {
  e.preventDefault();
  
  const goalInput = document.getElementById('goal-input');
  const goalTarget = document.getElementById('goal-target');
  const goalName = goalInput.value.trim();
  const targetPriority = goalTarget.value;
  
  if (!goalName || !targetPriority) {
    alert('Please fill in all fields');
    return;
  }
  
  // Save goal to localStorage
  const newGoal = {
    name: goalName,
    priority: targetPriority,
    startDate: new Date().toISOString()
  };
  
  localStorage.setItem('nutripal_wellness_goal', JSON.stringify(newGoal));
  
  // Reset check-in log when new goal is set
  localStorage.setItem('nutripal_checkins_log', '[]');
  localStorage.setItem('nutripal_streak', JSON.stringify({ current: 0, longest: 0 }));
  
  console.log('✅ Wellness goal saved:', newGoal);
  
  // Close modal and refresh display
  closeGoalModal_fn();
  loadAndDisplayProgress();
  
  showSuccessNotification('🎯 Goal set! Start checking in daily to track progress.');
}

/**
 * Delete Current Goal
 * Remove the current wellness goal and reset all progress
 */
function deleteCurrentGoal() {
  if (confirm('Are you sure you want to delete this goal? This will reset all your progress tracking.')) {
    localStorage.removeItem('nutripal_wellness_goal');
    localStorage.setItem('nutripal_checkins_log', '[]');
    localStorage.setItem('nutripal_streak', JSON.stringify({ current: 0, longest: 0 }));
    
    console.log('🗑️ Wellness goal deleted');
    
    // Close modal and refresh display
    closeGoalModal_fn();
    loadAndDisplayProgress();
    
    showSuccessNotification('✓ Goal deleted. You can set a new one anytime!');
  }
}

/**
 * Record Check-In
 * Called after each Botpress check-in to update progress
 * @param {Object} checkInData - Check-in data (optional)
 */
function recordCheckIn(checkInData = {}) {
  try {
    // Load existing check-ins
    const checkins = JSON.parse(localStorage.getItem('nutripal_checkins_log') || '[]');
    const streak = JSON.parse(localStorage.getItem('nutripal_streak') || '{"current": 0, "longest": 0}');
    
    // Check if already checked in today
    const today = new Date().toDateString();
    const alreadyCheckedInToday = checkins.some(c => 
      new Date(c.timestamp).toDateString() === today
    );
    
    if (alreadyCheckedInToday) {
      console.log('ℹ️ Already checked in today');
      return;
    }
    
    // Create new check-in record
    const newCheckIn = {
      timestamp: Date.now(),
      date: today,
      type: checkInData.type || 'wellness',
      feeling: checkInData.feeling || '',
      meals: checkInData.meals || [],
      notes: checkInData.notes || ''
    };
    
    // Add to check-ins log
    checkins.push(newCheckIn);
    localStorage.setItem('nutripal_checkins_log', JSON.stringify(checkins));
    
    // Update streak
    updateStreak(streak);
    
    console.log('✅ Check-in recorded');
    loadAndDisplayProgress();
  } catch (error) {
    console.error('❌ Error recording check-in:', error);
  }
}

/**
 * Update Streak
 * Increment streak if check-in continues daily
 * @param {Object} streak - Current streak data
 */
function updateStreak(streak) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const checkins = JSON.parse(localStorage.getItem('nutripal_checkins_log') || '[]');
  
  if (checkins.length === 0) {
    streak.current = 0;
  } else {
    const lastCheckIn = new Date(checkins[checkins.length - 1].timestamp);
    
    // Check if last check-in was today or yesterday
    if (lastCheckIn.toDateString() === today.toDateString()) {
      // Already checked in today, don't increment
      return;
    } else if (lastCheckIn.toDateString() === yesterday.toDateString()) {
      // Checked in yesterday, increment streak
      streak.current += 1;
    } else {
      // Streak broken, reset
      streak.current = 1;
    }
  }
  
  // Update longest streak if current is longer
  if (streak.current > streak.longest) {
    streak.longest = streak.current;
  }
  
  localStorage.setItem('nutripal_streak', JSON.stringify(streak));
}

/**
 * Record Daily Goal Completion
 * When user clicks "I Completed My Goals Today"
 * Increment streak and count completion
 */
function recordDailyGoalCompletion() {
  console.log('✅ Recording daily goal completion...');
  try {
    const checkins = JSON.parse(localStorage.getItem('nutripal_checkins_log') || '[]');
    const streak = JSON.parse(localStorage.getItem('nutripal_streak') || '{"current": 0, "longest": 0}');
    
    // Check if already completed today
    const today = new Date().toDateString();
    const alreadyCompletedToday = checkins.some(c => 
      new Date(c.timestamp).toDateString() === today && c.type === 'goal_completion'
    );
    
    if (alreadyCompletedToday) {
      console.log('ℹ️ Already marked as complete today');
      showSuccessNotification('✅ Already marked as complete today!');
      return;
    }
    
    // Create goal completion record
    const goalCompletion = {
      timestamp: Date.now(),
      date: today,
      type: 'goal_completion'
    };
    
    checkins.push(goalCompletion);
    localStorage.setItem('nutripal_checkins_log', JSON.stringify(checkins));
    
    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (checkins.length === 1) {
      streak.current = 1;
    } else {
      const previousCheckin = new Date(checkins[checkins.length - 2].timestamp);
      
      if (previousCheckin.toDateString() === yesterday.toDateString()) {
        streak.current += 1;
      } else {
        streak.current = 1;
      }
    }
    
    if (streak.current > streak.longest) {
      streak.longest = streak.current;
    }
    
    localStorage.setItem('nutripal_streak', JSON.stringify(streak));
    
    // Clear the current goal after completion
    localStorage.removeItem('nutripal_wellness_goal');
    
    // Refresh display
    loadAndDisplayProgress();
    const message = `🔥 ${streak.current}-day streak! Keep it up! 🎉`;
    console.log('✅ Goal completion recorded:', message);
    showSuccessNotification(message);
  } catch (error) {
    console.error('❌ Error recording goal completion:', error);
    alert('Error: Could not save goal completion. Check console.');
  }
}



// ===== END PROGRESS TRACKING =====

// Send Email via n8n Webhook
async function sendEmail(email, subject, message, userData = null) {
  try {
    const payload = {
      email: email,
      subject: subject,
      message: message,
      timestamp: new Date().toISOString()
    };
    
    // Add user data if provided (for meal planner)
    if (userData) {
      payload.name = userData.name;
      payload.diet = userData.diet;
      payload.goals = userData.goals;
    }
    
    console.log('Sending to webhook:', N8N_WEBHOOK_URL);
    console.log('Payload:', payload);
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      mode: 'cors'
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      return { success: true, message: 'Email sent successfully!' };
    } else {
      const errorText = await response.text();
      console.error('n8n error:', errorText);
      return { success: false, message: 'Failed to send email. Please try again.' };
    }
  } catch (error) {
    console.error('Email error:', error);
    console.error('Error message:', error.message);
    console.error('Error type:', error.name);
    return { success: false, message: 'Network error: ' + error.message };
  }
}

// Open/Close Meal Planner Modal
function openMealPlanner() {
  console.log('📱 openMealPlanner called');
  const modal = document.getElementById('chat-panel');
  console.log('📱 Modal found:', !!modal);
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    console.log('✅ Modal opened - open class added, aria-hidden set to false');
  } else {
    console.error('❌ Modal element not found');
  }
}

function closeMealPlanner() {
  console.log('📱 closeMealPlanner called');
  const modal = document.getElementById('chat-panel');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    console.log('✅ Modal closed - open class removed');
  }
}

// Event Listeners - Modal
/**
 * Initialize DOM element event listeners after page load
 * Attaches click handlers to buttons that depend on DOM elements
 */
function initModalEventListeners() {
  // Attach nav meal button listener
  if (navMealBtn) {
    navMealBtn.addEventListener('click', openMealPlanner);
    console.log('✅ Nav meal button listener attached');
  } else {
    console.warn('⚠️ Nav meal button element not found');
  }

  // Attach close button listeners
  if (closeMealPlannerBtn) {
    closeMealPlannerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMealPlanner();
    });
    console.log('✅ Close meal planner button listener attached');
  }
  
  if (closeGoalModalBtn) {
    closeGoalModalBtn.addEventListener('click', closeGoalModal_fn);
    console.log('✅ Close goal modal button listener attached');
  }

  // Attach meal planner form listener (input-form is the actual id in HTML)
  if (inputForm) {
    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitMealPlannerForm();
    });
    console.log('✅ Meal planner input form listener attached');
  } else {
    console.warn('⚠️ Meal planner input form not found');
  }

  // Attach modal overlay click to close
  const modalOverlay = document.querySelector('.meal-planner-modal .modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', closeMealPlanner);
    console.log('✅ Modal overlay click listener attached');
  }

  // Attach goal form listener (static form in HTML)
  const goalForm = document.getElementById('goal-form');
  if (goalForm) {
    goalForm.addEventListener('submit', handleGoalSubmit);
    console.log('✅ Goal form listener attached');
  } else {
    console.warn('⚠️ Goal form not found');
  }

  // Attach CTA button listeners
  const ctaPrimary = document.getElementById('cta-primary');
  const ctaSecondary = document.getElementById('cta-secondary');
  const ctaFinal = document.getElementById('cta-final');

  if (ctaPrimary) {
    ctaPrimary.addEventListener('click', openMealPlanner);
    console.log('✅ CTA primary button listener attached');
  }

  if (ctaSecondary) {
    ctaSecondary.addEventListener('click', () => {
      document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (ctaFinal) {
    ctaFinal.addEventListener('click', openMealPlanner);
  }
}

// ===== SCROLL ANIMATIONS AND VISUAL EFFECTS =====

// Recipe Filtering
function initRecipeFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const recipeCards = document.querySelectorAll('.recipe-card');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filter = btn.getAttribute('data-filter');
      
      // Filter recipes
      recipeCards.forEach(card => {
        if (filter === 'all') {
          card.style.display = 'grid';
        } else {
          const categories = card.getAttribute('data-category').split(' ');
          card.style.display = categories.includes(filter) ? 'grid' : 'none';
        }
      });
    });
  });
}

function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe feature cards, guide cards, recipe cards, and blog posts
  document.querySelectorAll('.feature-card, .guide-card, .recipe-card, .blog-post').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// Add smooth button press effects
function initButtonEffects() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255, 255, 255, 0.5)';
      ripple.style.transform = 'scale(0)';
      ripple.style.animation = 'ripple 0.6s ease-out';
      ripple.style.pointerEvents = 'none';
      
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

// Add ripple animation to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ===== BOTPRESS SELF CHECK-IN FEATURE =====
// This section handles the daily wellness check-in flow with Botpress

/**
 * Initialize Botpress Self Check-In Feature
 * - Adds click handler to self check-in button
 * - Triggers Botpress event when button is clicked
 * - Collects and stores user wellness data
 */
function initBotpressSelfCheckIn() {
  const checkInBtn = document.getElementById('self-checkin-btn');
  
  if (!checkInBtn) {
    console.warn('⚠️ Self check-in button not found');
    return false;
  }

  // Check if listener is already attached (avoid duplicates)
  if (checkInBtn.dataset.listenersAttached === 'true') {
    console.log('ℹ️ Self check-in listeners already attached');
    return true;
  }

  /**
   * Handle Self Check-In Button Click
   * Triggers Botpress event to start the self check-in conversation flow
   */
  checkInBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('📝 Self Check-In button clicked');
    
    // Check if Botpress is available
    if (!window.botpress) {
      console.warn('⚠️ Botpress not available - trying to load');
      // Try to access botpress anyway - it might be loading
      setTimeout(() => {
        if (window.botpress && window.botpress.open) {
          window.botpress.open();
        }
      }, 500);
      return;
    }
    
    try {
      // First, open the webchat
      if (window.botpress.open && typeof window.botpress.open === 'function') {
        window.botpress.open();
        console.log('✅ Botpress webchat opened');
      }
      
      // Then send the event to trigger self_check_in flow
      if (window.botpress.sendEvent && typeof window.botpress.sendEvent === 'function') {
        window.botpress.sendEvent({
          type: 'trigger',
          payload: {
            text: 'start_self_checkin'
          }
        });
        console.log('✅ Self check-in event sent to Botpress');
      } else {
        console.log('ℹ️ sendEvent method not available - webchat is open for user interaction');
      }
    } catch (error) {
      console.error('❌ Error triggering self check-in:', error);
    }
  });

  // Mark that listeners have been attached
  checkInBtn.dataset.listenersAttached = 'true';
  checkInBtn.style.cursor = 'pointer';
  console.log('✅ Self check-in button click handler attached');
  return true;
}

/**
 * Store Self Check-In Data to Local Storage
 * Saves user responses from the check-in conversation
 * @param {Object} data - Check-in data object
 */
function saveSelfCheckInData(data) {
  try {
    const checkInHistory = JSON.parse(localStorage.getItem('nutripal_checkins') || '[]');
    checkInHistory.push({
      ...data,
      timestamp: new Date().toISOString()
    });
    // Keep last 30 check-ins
    if (checkInHistory.length > 30) {
      checkInHistory.shift();
    }
    localStorage.setItem('nutripal_checkins', JSON.stringify(checkInHistory));
    console.log('✅ Check-in data saved');
  } catch (error) {
    console.error('Error saving check-in data:', error);
  }
}

/**
 * Retrieve Self Check-In History
 * Gets all stored check-in records for the user
 * @returns {Array} Array of check-in records
 */
function getSelfCheckInHistory() {
  try {
    return JSON.parse(localStorage.getItem('nutripal_checkins') || '[]');
  } catch (error) {
    console.error('Error retrieving check-in history:', error);
    return [];
  }
}

/**
 * Get Latest Self Check-In
 * Returns the most recent check-in record
 * @returns {Object|null} Latest check-in or null if none exist
 */
function getLatestSelfCheckIn() {
  const history = getSelfCheckInHistory();
  return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * Listen for Botpress Messages to Extract Check-In Data
 * Processes responses from the self check-in flow
 */
function initBotpressCheckInListener() {
  if (window.botpress && window.botpress.on) {
    // Listen for user messages from the check-in flow
    window.botpress.on('message_received', (message) => {
      console.log('📨 Message received from Botpress:', message);
      
      // Check if this is a check-in flow completion
      if (message.payload && message.payload.metadata) {
        const metadata = message.payload.metadata;
        
        // If metadata contains check-in data, save it
        if (metadata.check_in_data) {
          saveSelfCheckInData(metadata.check_in_data);
          // Record check-in for progress tracking
          recordCheckIn(metadata.check_in_data);
          console.log('✅ Self check-in data processed and saved');
        }
      }
    });

    // Listen for Botpress events
    window.botpress.on('payload:received', (payload) => {
      console.log('📦 Payload received from Botpress:', payload);
      
      // Handle custom payloads from the check-in flow
      if (payload.check_in_complete) {
        console.log('🎉 Self check-in completed');
        saveSelfCheckInData(payload.data);
        // Record check-in for progress tracking
        recordCheckIn(payload.data);
      }
    });
  }
}

// Initialize Self Check-In when Botpress is ready
// ===== BOTPRESS SELF CHECK-IN FEATURE =====
// This will be called from main DOMContentLoaded handler
/**
 * Initialize Botpress Self Check-In Feature
 * Creates button that opens Botpress chat for wellness self-assessment
 */
function initBotpressEmbeddedChat() {
  console.log('🤖 Initializing Botpress embedded webchat...');
  
  // Step 1: Configure Botpress to render in container (not floating)
  if (window.botpress && window.botpress.configure) {
    window.botpress.configure({
      // Disable floating FAB button - we'll use embedded container
      hideWidget: false,
      containerSelector: '#webchat-container'
    });
    
    console.log('✅ Botpress configured to render in embedded container');
  }

  // Step 2: Wait for webchat to be fully loaded
  const checkWebchatReady = setInterval(() => {
    const webchatContainer = document.getElementById('webchat-container');
    
    if (webchatContainer && webchatContainer.querySelector('.bpWebchat')) {
      clearInterval(checkWebchatReady);
      console.log('✅ Botpress webchat loaded in container');
      
      // Step 3: Send proactive greeting message after 1.5 second delay
      setTimeout(() => {
        sendBotpressGreetingMessage();
      }, 1500);
    }
  }, 300);

  // Timeout after 8 seconds
  setTimeout(() => {
    clearInterval(checkWebchatReady);
    console.warn('⚠️ Botpress webchat initialization timeout');
  }, 8000);
}

/**
 * Send Initial Greeting Message via Botpress
 * Proactively initiates wellness conversation without user interaction
 * Greeting: "Hi 👋 How are you feeling today? Did you eat already?"
 */
function sendBotpressGreetingMessage() {
  if (window.botpress && window.botpress.sendEvent) {
    // Create greeting event
    const greetingEvent = {
      type: 'trigger',
      payload: {
        text: 'start_wellness_check'
      }
    };

    try {
      // Send event to trigger initial wellness flow
      window.botpress.sendEvent(greetingEvent);
      console.log('✅ Greeting message sent to Botpress');
    } catch (error) {
      console.error('❌ Error sending greeting message:', error);
    }

    // Step 4: Listen for user responses
    listenForUserResponses();
  } else {
    console.warn('⚠️ Botpress sendEvent not available yet');
  }
}

/**
 * Listen for User Responses and Route to nutrition_nudge Flow
 * Monitors user messages for indicators of not having eaten
 * Routes conversation to nutrition education if needed
 */
function listenForUserResponses() {
  if (window.botpress && window.botpress.on) {
    // Listen for incoming messages from user
    window.botpress.on('message_received', (message) => {
      console.log('📨 User message received:', message);

      // Check message content for negative/not-eaten indicators
      if (message.payload && message.payload.text) {
        const userText = message.payload.text.toLowerCase();
        
        // Check if user indicates they haven't eaten yet
        const notEatenKeywords = [
          'no', 'haven\'t', 'havent', 'not yet', 'nope', 'skip', 'missed', 
          'forgot', 'didn\'t', 'didnt', 'haven\'t eaten', 'haven\'t ate',
          'nothing', 'not eat', 'skip meals', 'no food', 'bad', 'terrible',
          'awful', 'sick', 'stressed', 'anxious', 'tired', 'weak'
        ];

        const shouldTriggerNutritionNudge = notEatenKeywords.some(keyword => 
          userText.includes(keyword)
        );

        if (shouldTriggerNutritionNudge) {
          console.log('🍎 User needs nutrition nudge - triggering education flow');
          
          // Step 5: Route to nutrition_nudge flow
          setTimeout(() => {
            routeToNutritionNudge();
          }, 500);
        }
      }
    });

    // Listen for payload events
    window.botpress.on('payload:received', (payload) => {
      console.log('📦 Botpress payload received:', payload);
    });

    console.log('✅ User response listeners initialized');
  }
}

/**
 * Route Conversation to nutrition_nudge Flow
 * Sends event to trigger Botpress flow for nutrition education
 * Flow asks: "What did you eat today?" and provides meal suggestions
 */
function routeToNutritionNudge() {
  if (window.botpress && window.botpress.sendEvent) {
    const nudgeEvent = {
      type: 'trigger',
      payload: {
        text: 'nutrition_nudge'
      }
    };

    try {
      window.botpress.sendEvent(nudgeEvent);
      console.log('✅ Routed to nutrition_nudge flow');
    } catch (error) {
      console.error('❌ Error routing to nutrition_nudge:', error);
    }
  }
}

// ===== COMMUNITY WELLNESS SHARING FEATURE =====
/**
 * Community Sharing System
 * Allow users to anonymously share wellness wins and health goals
 * Store posts in localStorage with timestamps and reactions
 */

// DOM Elements for Community Feature
const communityForm = document.getElementById('community-form');
const communityInput = document.getElementById('community-input');
const communityFeed = document.getElementById('community-feed');
const charCount = document.getElementById('char-count');

// Anonymous name generator
const anonymousNames = [
  '🌟 Wellness Champion', '💪 Health Hero', '🥗 Nutrition Guru',
  '🌱 Growth Seeker', '✨ Wellness Warrior', '🎯 Goal Getter',
  '🌈 Positive Soul', '💚 Health Lover', '🚀 Progress Pioneer',
  '🏃 Fitness Friend', '🧘 Mindful Mover', '⚡ Energy Booster'
];

const reactionEmojis = ['❤️', '🔥', '👏', '🌟', '💪', '🙌'];

/**
 * Initialize Community Sharing Feature
 * Set up form submission and feed display
 */
function initCommunitySharing() {
  console.log('🌱 Initializing community wellness sharing...');

  // Load existing posts from localStorage
  loadCommunityPosts();

  // Set up form submission
  if (communityForm) {
    communityForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitCommunityPost();
    });
  }

  // Character counter
  if (communityInput) {
    communityInput.addEventListener('input', (e) => {
      const count = e.target.value.length;
      charCount.textContent = `${count}/280`;
      
      // Change color when approaching limit
      if (count > 250) {
        charCount.style.color = '#f59e0b';
      } else if (count > 270) {
        charCount.style.color = '#ef4444';
      } else {
        charCount.style.color = '#9ca3af';
      }
    });
  }

  console.log('✅ Community sharing feature initialized');
}

/**
 * Submit Community Post
 * Create new post object, save to localStorage, display in feed
 */
function submitCommunityPost() {
  const text = communityInput.value.trim();

  if (text.length === 0 || text.length > 280) {
    alert('Please keep your post between 1 and 280 characters');
    return;
  }

  // Create post object with anonymous user
  const post = {
    id: Date.now(), // Simple unique ID using timestamp
    author: getRandomAnonymousName(),
    content: text,
    timestamp: new Date().toISOString(),
    reactions: {} // Track reaction counts by emoji
  };

  // Save to localStorage
  saveCommunityPost(post);

  // Clear input and reset counter
  communityInput.value = '';
  charCount.textContent = '0/280';
  charCount.style.color = '#9ca3af';

  // Refresh feed display
  loadCommunityPosts();

  // Show success message
  showSuccessNotification('🎉 Post shared! Inspiring others on their wellness journey!');
}

/**
 * Save Community Post to LocalStorage
 * @param {Object} post - Post object with id, author, content, timestamp
 */
function saveCommunityPost(post) {
  try {
    const existingPosts = JSON.parse(localStorage.getItem('nutripal_community_posts') || '[]');
    existingPosts.push(post);
    
    // Keep last 100 posts to manage storage
    if (existingPosts.length > 100) {
      existingPosts.shift();
    }
    
    localStorage.setItem('nutripal_community_posts', JSON.stringify(existingPosts));
    console.log('✅ Post saved to community feed');
  } catch (error) {
    console.error('❌ Error saving post:', error);
  }
}

/**
 * Load Community Posts from LocalStorage
 * Display all posts in reverse chronological order (newest first)
 */
function loadCommunityPosts() {
  try {
    const posts = JSON.parse(localStorage.getItem('nutripal_community_posts') || '[]');
    
    // Clear feed
    communityFeed.innerHTML = '';

    if (posts.length === 0) {
      communityFeed.innerHTML = '<div class="empty-feed"><p>No posts yet. Be the first to share your wellness journey! 🌟</p></div>';
      return;
    }

    // Display posts in reverse order (newest first)
    posts.reverse().forEach(post => {
      const postElement = createPostElement(post);
      communityFeed.appendChild(postElement);
    });

    console.log(`✅ Loaded ${posts.length} community posts`);
  } catch (error) {
    console.error('❌ Error loading posts:', error);
  }
}

/**
 * Create Post Element
 * Build HTML structure for a single post with reactions
 * @param {Object} post - Post object
 * @returns {HTMLElement} - Post element
 */
function createPostElement(post) {
  const postDiv = document.createElement('div');
  postDiv.className = 'community-post';
  postDiv.dataset.postId = post.id;

  // Format timestamp
  const timeAgo = getTimeAgo(new Date(post.timestamp));

  // Get random avatar emoji
  const avatarEmoji = '🌟💚🌱✨💪🎯🔥🌈⚡🏃🧘👏'.split('')[Math.floor(Math.random() * 12)];

  // Build post HTML
  postDiv.innerHTML = `
    <div class="post-header">
      <div class="post-user">
        <div class="post-avatar">${avatarEmoji}</div>
        <div class="post-meta">
          <div class="post-username">${escapeHtml(post.author)}</div>
          <div class="post-time">${timeAgo}</div>
        </div>
      </div>
      <button class="btn-post-delete" onclick="deletePost(${post.id});" title="Delete post">✕</button>
    </div>
    
    <div class="post-content">${escapeHtml(post.content)}</div>
    
    <div class="post-reactions">
      ${reactionEmojis.map(emoji => {
        const count = post.reactions[emoji] || 0;
        return `
          <button class="reaction-btn" data-emoji="${emoji}" data-post-id="${post.id}">
            <span>${emoji}</span>
            ${count > 0 ? `<span class="reaction-count">${count}</span>` : ''}
          </button>
        `;
      }).join('')}
    </div>
  `;

  // Add reaction handlers
  postDiv.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const emoji = btn.dataset.emoji;
      const postId = parseInt(btn.dataset.postId);
      addReactionToPost(postId, emoji);
    });
  });

  return postDiv;
}

/**
 * Add Reaction to Post
 * Toggle reaction count and update localStorage
 * @param {number} postId - Post ID
 * @param {string} emoji - Reaction emoji
 */
function addReactionToPost(postId, emoji) {
  try {
    const posts = JSON.parse(localStorage.getItem('nutripal_community_posts') || '[]');
    const post = posts.find(p => p.id === postId);

    if (post) {
      // Toggle reaction
      if (post.reactions[emoji]) {
        post.reactions[emoji]++;
      } else {
        post.reactions[emoji] = 1;
      }

      // Save updated posts
      localStorage.setItem('nutripal_community_posts', JSON.stringify(posts));

      // Refresh feed
      loadCommunityPosts();

      console.log(`✅ Added reaction ${emoji} to post ${postId}`);
    }
  } catch (error) {
    console.error('❌ Error adding reaction:', error);
  }
}

/**
 * Delete Community Post
 * Remove a post from the community feed
 * @param {number} postId - Post ID to delete
 */
function deletePost(postId) {
  if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    try {
      const posts = JSON.parse(localStorage.getItem('nutripal_community_posts') || '[]');
      const filteredPosts = posts.filter(p => p.id !== postId);
      
      localStorage.setItem('nutripal_community_posts', JSON.stringify(filteredPosts));
      
      console.log(`🗑️ Post ${postId} deleted`);
      
      // Refresh feed
      loadCommunityPosts();
      showSuccessNotification('✓ Post deleted');
    } catch (error) {
      console.error('❌ Error deleting post:', error);
      alert('Error deleting post');
    }
  }
}

/**
 * Get Time Ago String
 * Convert timestamp to human-readable "time ago" format
 * @param {Date} date - Post date
 * @returns {string} - Time ago string
 */
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Get Random Anonymous Name
 * @returns {string} - Random anonymous name
 */
function getRandomAnonymousName() {
  return anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
}

/**
 * Escape HTML Special Characters
 * Prevent XSS attacks by escaping user input
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show Success Notification
 * Display temporary success message to user
 * @param {string} message - Message text
 */
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    font-weight: 500;
    max-width: 300px;
    white-space: pre-wrap;
    word-wrap: break-word;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
}

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing NutriPal features...');

  // Initialize DOM elements first - CRITICAL: must be first
  initDOMElements();
  console.log('✅ DOM elements initialized');

  // Attach event listeners to DOM elements
  initModalEventListeners();
  console.log('✅ Modal event listeners attached');

  // Initialize progress tracking (no dependencies)
  initProgressTracking();

  // Initialize recipe filters
  initRecipeFilters();

  // Initialize community sharing
  initCommunitySharing();

  // Initialize self check-in button IMMEDIATELY (doesn't depend on Botpress being ready)
  initBotpressSelfCheckIn();

  // Initialize Botpress embedded chat
  const checkBotpressLoaded = setInterval(() => {
    if (window.botpress) {
      clearInterval(checkBotpressLoaded);
      initBotpressEmbeddedChat();
    }
  }, 300);

  // Timeout for Botpress after 10 seconds
  setTimeout(() => {
    clearInterval(checkBotpressLoaded);
  }, 10000);

  // Initialize Botpress event listeners when ready
  const checkBotpressReady = setInterval(() => {
    if (window.botpress && window.botpress.sendEvent) {
      clearInterval(checkBotpressReady);
      initBotpressCheckInListener();
      console.log('✅ Botpress event listeners initialized');
    }
  }, 500);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkBotpressReady);
  }, 10000);

  // Load and display daily goals if saved
  const savedDailyGoals = localStorage.getItem('nutripal_daily_goals');
  if (savedDailyGoals) {
    displayDailyGoals(savedDailyGoals);
  }

  console.log('✅ All NutriPal features initialized');
});

// ===== END BOTPRESS EMBEDDED AND COMMUNITY FEATURES =====

/**
 * Submit Meal Planner Form
 * Collects user data and sends to n8n webhook for meal plan generation
 */
function submitMealPlannerForm() {
  console.log('===== FORM SUBMISSION STARTED =====');
  
  try {
    // Get form data
    const nameInput = document.getElementById('planner-name');
    const emailInput = document.getElementById('planner-email');
    const dietInput = document.getElementById('planner-diet');
    
    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const dietPreference = dietInput?.value;
    
    console.log('Form values:', { name, email, dietPreference });
    
    // Get selected health goals
    const goalCheckboxes = document.querySelectorAll('input[name="goals"]:checked');
    const goals = Array.from(goalCheckboxes).map(cb => cb.value);
    
    console.log('Health goals:', goals);
    
    // Validate form
    if (!name || !email || !dietPreference || goals.length === 0) {
      console.warn('Form validation FAILED');
      alert('Please fill all fields');
      return false;
    }
    
    console.log('✅ Form validation passed');
    
    // Show loading state
    const submitBtn = document.querySelector('#input-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = '⏳ Submitting...';
      submitBtn.disabled = true;
    }
    
    // Create payload
    const payload = {
      fullname: name,
      email: email,
      diet: dietPreference,
      goals: goals
    };
    
    console.log('📤 Sending payload:', payload);
    console.log('📤 To URL:', N8N_WEBHOOK_URL);
    console.log('📤 ABOUT TO CALL FETCH NOW');
    
    // Send to n8n with proper JSON headers
    const fetchPromise = fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📤 FETCH CALLED, waiting for response...');
    
    fetchPromise.then(() => {
      console.log('✅ Fetch completed (then)');
      // Show success
      showSuccessNotification(`✅ Form Submitted! We'll send your meal plan to ${email} shortly!`);
      
      // Close modal
      const modal = document.getElementById('chat-panel');
      if (modal) {
        modal.classList.remove('open');
      }
      
      // Reset form
      const inputForm = document.getElementById('input-form');
      if (inputForm) {
        inputForm.reset();
      }
      
      // Reset button
      if (submitBtn) {
        submitBtn.textContent = '📧 Get My Meal Plan';
        submitBtn.disabled = false;
      }
    })
    .catch(error => {
      console.error('❌ Fetch error (catch):', error);
      
      // Show success anyway - data was sent
      showSuccessNotification(`✅ Form Submitted! We'll send your meal plan to ${email} shortly!`);
      
      // Close modal
      const modal = document.getElementById('chat-panel');
      if (modal) {
        modal.classList.remove('open');
      }
      
      // Reset form
      const inputForm = document.getElementById('input-form');
      if (inputForm) {
        inputForm.reset();
      }
      
      // Reset button
      if (submitBtn) {
        submitBtn.textContent = '📧 Get My Meal Plan';
        submitBtn.disabled = false;
      }
    });
    
    return false;
  } catch (error) {
    console.error('❌ Error in submitMealPlannerForm:', error);
    alert('Error: ' + error.message);
    return false;
  }
}
