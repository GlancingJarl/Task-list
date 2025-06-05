const calendarContainer = document.getElementById('calendarContainer');

// Declare variables globally, but assign elements inside DOMContentLoaded
let modal = null;
let openModalButton = null;
let closeButton = null;
let doneSelectingButton = null;
let taskDescriptionInput = null;
let selectedDateForPanel = null; // Store the date of the currently selected day

// Variables to keep track of the currently displayed month and year
let currentMonth = new Date().getMonth(); // 0-indexed
let currentYear = new Date().getFullYear();

// Month names array (moved to global scope)
const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // Keep dayNames here too

// Variable to store tasks (using a simple array for now, will need more structure for weekly tasks)
let tasks = JSON.parse(localStorage.getItem('calendarTasks')) || [];

// Variable to store the description of the task being added during selection mode
let taskDescriptionToSave = '';
// Variable to track if we are in selection mode
let isSelectingDate = false;

function generateCalendar() {
  // Use the globally tracked month and year
  const year = currentYear;
  const month = currentMonth;

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get the day of the week for the first day (0 for Sunday, 6 for Saturday)
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Wrap button and title in a div with class calendar-header
  let calendarHTML = '<div class="calendar-header">';
  calendarHTML += '<button id="openAddTaskModal">Add Task</button>';
  calendarHTML += '<button id="prevMonthButton">&lt;</button>';
  calendarHTML += `<h2>${monthNames[month]} ${year}</h2>`;
  calendarHTML += '<button id="nextMonthButton">&gt;</button>';
  calendarHTML += '</div>'; // Close calendar-header div
  calendarHTML += '<div class="calendar-grid">';

  // Add day names row
  dayNames.forEach(day => {
    calendarHTML += `<div class="day-name">${day}</div>`;
  });

  // Add empty divs for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarHTML += '<div class="empty-day"></div>';
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const isToday = currentDate.toDateString() === new Date().toDateString();
    let dayClass = isToday ? 'calendar-day current-day' : 'calendar-day';

    // Find tasks for the current day
    const tasksForDay = tasks.filter(task => {
        const taskDate = new Date(task.date);
        if (task.type === 'one-time') {
            // For one-time tasks, check if the task date is the same as the current calendar day
            return taskDate.toDateString() === currentDate.toDateString();
        } else if (task.type === 'weekly') {
            // For weekly tasks, check if the stored day of the week matches the current day of the week
            // AND if the task's start date is on or before the current date
            return task.dayOfWeek === currentDate.getDay() && taskDate <= currentDate;
        }
        return false; // Should not happen
    });

    let taskIndicatorHTML = '';
    if (tasksForDay.length > 0) {
        // Check if all tasks for this day are completed, considering task type
        const allTasksCompleted = tasksForDay.every(task => {
            if (task.type === 'one-time') {
                return task.completed;
            } else if (task.type === 'weekly') {
                 // Check if the current date (for the day being generated) is in the completedDates array
                 return task.completedDates.includes(currentDate.toISOString());
            }
            return false; // Should not happen
        });

        taskIndicatorHTML = '<div class="task-indicator"></div>'; // Simple indicator for now
        if (allTasksCompleted) {
            dayClass += ' all-tasks-completed'; // Add a class for green styling
        } else {
             dayClass += ' has-tasks'; // Add a class for yellow styling
        }
    }

    calendarHTML += `<div class="${dayClass}">${day}${taskIndicatorHTML}</div>`;
  }

  calendarHTML += '</div>';

  calendarContainer.innerHTML = calendarHTML;


}

// New function to add event listeners to dynamically created calendar elements
// These listeners use event delegation and are permanent.
function addCalendarEventListeners() {
  // Add click listeners to calendar days and weekday names (using event delegation)
  // const calendarDays = calendarContainer.querySelectorAll('.calendar-day'); // Not needed for event delegation
  const infoPanelTitle = document.querySelector('#infoPanel h2');

  // Variable to keep track of the currently selected day element
  // let selectedDayElement = null; // This state is more for info panel and less relevant for adding now

  // After regenerating calendar, if in selection mode, re-apply highlighting - Removed, handled by explicit state changes
  // if (isSelectingDate) {
  //     document.querySelectorAll('.calendar-day:not(.empty-day), .day-name').forEach(element => {
  //         element.classList.add('selectable-day');
  //     });
  //     // Ensure the done button is visible if in selection mode
  //     if (doneSelectingButton) doneSelectingButton.style.display = 'block';
  // }

  // Use event delegation for calendar days
  calendarContainer.addEventListener('click', (event) => {
      const dayElement = event.target.closest('.calendar-day');

      // Handle existing info panel logic only if NOT in selection mode
      if (dayElement && !dayElement.classList.contains('empty-day') && !isSelectingDate) {
          // Find the actual calendar-day element if a child was clicked
          const clickedCalendarDay = event.target.closest('.calendar-day');

           // Remove the 'selected-day' class from the previously selected day, if any
          const previouslySelectedDayElement = calendarContainer.querySelector('.calendar-day.selected-day');
          if (previouslySelectedDayElement) {
            previouslySelectedDayElement.classList.remove('selected-day');
          }

          // Add the 'selected-day' class to the clicked day
          if (clickedCalendarDay) {
             clickedCalendarDay.classList.add('selected-day');

             const day = parseInt(clickedCalendarDay.textContent);
             // Get the year and month from the generated calendar title
             const [monthName, year] = calendarContainer.querySelector('h2').textContent.split(' ');
             const month = monthNames.indexOf(monthName);
             const clickedDate = new Date(parseInt(year), month, day);

             selectedDateForPanel = clickedDate; // Store the selected date globally
             updateInfoPanel(selectedDateForPanel); // Update info panel for the selected date

          }
        } // End of NOT in selection mode block

        // Handle task saving if in selection mode and a day is clicked
        if (isSelectingDate && dayElement && !dayElement.classList.contains('empty-day')) {
             // Save as a one-time task
            const day = parseInt(dayElement.textContent);
            const [monthName, year] = calendarContainer.querySelector('h2').textContent.split(' ');
            const month = monthNames.indexOf(monthName);
            const selectedDate = new Date(parseInt(year), month, day);

            const newTask = {
              description: taskDescriptionToSave,
              type: 'one-time',
              date: selectedDate.toISOString()
            };

            tasks.push(newTask);
            saveCalendarTasks(); // Save the updated tasks array

            // Optional: Provide feedback to the user
            // The saveCalendarTasks call regenerates, so add feedback after a short delay
             setTimeout(() => {
                 // Recalculate startingDayOfWeek here for feedback highlighting
                 // Get year and month from the calendar title, not current date
                 const calendarTitle = calendarContainer.querySelector('h2').textContent.split(' ');
                 const currentYear = parseInt(calendarTitle[1]);
                 const currentMonth = monthNames.indexOf(calendarTitle[0]);
                 const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
                 const startingDayOfWeek = firstDayOfCurrentMonth.getDay();

                 // Corrected nth-child calculation: 7 day names + starting empty days + the day of the month
                 const dayOfMonth = parseInt(dayElement.textContent);
                 const nthChildIndex = 7 + startingDayOfWeek + dayOfMonth;

                 const updatedDayElement = calendarContainer.querySelector('.calendar-grid .calendar-day:nth-child(' + nthChildIndex + ')');
                 if (updatedDayElement) {
                    updatedDayElement.classList.add('task-added-feedback'); // Add a class for temporary feedback
                    setTimeout(() => {
                        updatedDayElement.classList.remove('task-added-feedback');
                    }, 500); // Remove class after 500ms
                 }
             }, 50); // Small delay to allow DOM update

            // Keep selection mode active, do NOT reset state or UI here
        }
  });

  // Use event delegation for weekday names
  calendarContainer.addEventListener('click', (event) => {
      const dayNameElement = event.target.closest('.day-name');

      if (dayNameElement && isSelectingDate) {
          // Save as a weekly task
          // Get the index of the clicked day name
          const dayNameElements = calendarContainer.querySelectorAll('.day-name');
          let weekdayIndex = -1;
          dayNameElements.forEach((element, index) => {
              if (element === dayNameElement) {
                  weekdayIndex = index;
              }
          });

          if (weekdayIndex !== -1) {
               // Store the date the task was added as the start date for the weekly task
              const addedDate = new Date();

              const newTask = {
                description: taskDescriptionToSave,
                type: 'weekly',
                dayOfWeek: weekdayIndex,
                date: addedDate.toISOString(), // Store the date added
                completedDates: [] // Add an array to store dates this weekly task was completed
              };

              tasks.push(newTask);
              saveCalendarTasks(); // Save the updated tasks array

              // Keep selection mode active, do NOT reset state or UI here

              // Add feedback to the weekday name - apply class directly to the clicked element before regeneration
              dayNameElement.classList.add('task-added-feedback'); // Add a class for temporary feedback
               setTimeout(() => {
                   // Need to find the updated element after regeneration
                   const updatedDayNameElement = calendarContainer.querySelectorAll('.day-name')[weekdayIndex];
                   if (updatedDayNameElement) {
                       updatedDayNameElement.classList.remove('task-added-feedback');
                   }
               }, 500); // Remove class after 500ms

               // Also highlight all corresponding days in the calendar view
               const calendarDaysToHighlight = [];
               const currentYear = parseInt(calendarContainer.querySelector('h2').textContent.split(' ')[1]);
               const currentMonth = monthNames.indexOf(calendarContainer.querySelector('h2').textContent.split(' ')[0]);

               // Find all calendar days that match the selected weekday
               calendarContainer.querySelectorAll('.calendar-grid .calendar-day:not(.empty-day)').forEach(dayElement => {
                   const dayOfMonth = parseInt(dayElement.textContent);
                   const dateForDay = new Date(currentYear, currentMonth, dayOfMonth);
                   if (dateForDay.getDay() === weekdayIndex) {
                       dayElement.classList.add('task-added-feedback');
                       calendarDaysToHighlight.push(dayElement);
                   }
               });

               // Remove highlight after a short delay
               setTimeout(() => {
                   calendarDaysToHighlight.forEach(element => {
                       element.classList.remove('task-added-feedback');
                   });
               }, 500);
           }
       }
   });

   // Use event delegation for the Open Add Task Modal button
   calendarContainer.addEventListener('click', (event) => {
       const openModalButtonInsideCalendar = event.target.closest('#openAddTaskModal');

       if (openModalButtonInsideCalendar) {
            if (modal) modal.style.display = "block";
        }
   });

   // Add hover effects for weekday names using event delegation
   calendarContainer.addEventListener('mouseover', (event) => {
       const dayNameElement = event.target.closest('.day-name');

       if (dayNameElement) {
           // Get the index of the hovered day name
           const dayNameElements = calendarContainer.querySelectorAll('.day-name');
           let hoveredWeekdayIndex = -1;
           dayNameElements.forEach((element, index) => {
               if (element === dayNameElement) {
                   hoveredWeekdayIndex = index;
               }
           });

           if (hoveredWeekdayIndex !== -1) {
               // Highlight all calendar days of this weekday
               const calendarDays = calendarContainer.querySelectorAll('.calendar-day:not(.empty-day)');
               const year = parseInt(calendarContainer.querySelector('h2').textContent.split(' ')[1]);
               const monthName = calendarContainer.querySelector('h2').textContent.split(' ')[0];
               const month = monthNames.indexOf(monthName);
               const firstDayOfMonth = new Date(year, month, 1);
               const startingDayOfWeek = firstDayOfMonth.getDay();

               calendarDays.forEach((dayElement, index) => {
                    // Calculate the day of the week for this calendar day element
                    // The index in the NodeList is 0-based relative to non-empty days
                    // Need to adjust for the starting day of the week
                    const dayOfMonth = parseInt(dayElement.textContent);
                    const dateForDay = new Date(year, month, dayOfMonth);
                    const dayOfWeekForDay = dateForDay.getDay();

                    if (dayOfWeekForDay === hoveredWeekdayIndex) {
                        dayElement.classList.add('weekday-highlight');
                    }
               });
           }
       }
   });

    calendarContainer.addEventListener('mouseout', (event) => {
       const dayNameElement = event.target.closest('.day-name');

       // Only remove highlighting if the mouse is leaving a day name element
       // This prevents removing highlight when moving from day name to a highlighted day
       if (dayNameElement) {
            // Remove highlighting from all previously highlighted days
           document.querySelectorAll('.calendar-day.weekday-highlight').forEach(element => {
               element.classList.remove('weekday-highlight');
           });
       }
   });

}

// Function to explicitly enter selection mode
function enterSelectionMode() {
    isSelectingDate = true;
    // Apply selection mode class to container for CSS highlighting
    calendarContainer.classList.add('selection-mode');
     // Show the done button
     if (doneSelectingButton) doneSelectingButton.style.display = 'block';

}

 // Function to explicitly exit selection mode
function exitSelectionMode() {
    isSelectingDate = false;
    taskDescriptionToSave = ''; // Clear the stored description
    // Remove selection mode class from container
    calendarContainer.classList.remove('selection-mode');
    // Hide the button
    if (doneSelectingButton) doneSelectingButton.style.display = 'none';
    // Regenerate calendar now to show updated indicators
    generateCalendar();
}

// Update DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    // Get element references after DOM is ready and assign to global variables
    modal = document.getElementById('addTaskModal');
    closeButton = modal ? modal.querySelector('.close') : null;
    doneSelectingButton = document.getElementById('doneSelectingButton');
    taskDescriptionInput = document.getElementById('taskDescription');

    // Generate calendar after loading tasks
    loadCalendarTasks();

    // Add event listeners after the DOM is ready
    addCalendarEventListeners();

    if (closeButton) {
        closeButton.onclick = function() {
          if (modal) modal.style.display = "none";
        }
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (modal && event.target == modal) {
        modal.style.display = "none";
      }
    }

    // Add event listener for the Done Selecting button
    // Ensure this is assigned only once
    if (doneSelectingButton && !doneSelectingButton._listenerAttached) {
        doneSelectingButton.addEventListener('click', () => {
            exitSelectionMode(); // Call the exit function
        });
         doneSelectingButton._listenerAttached = true; // Mark listener as attached
    }

    // Assign form submit listener here after modal and input are assigned
    const addTaskForm = document.getElementById('addTaskForm');
     if (addTaskForm) {
        addTaskForm.addEventListener('submit', (event) => {
          event.preventDefault(); // Prevent default form submission

          // Use the globally assigned taskDescriptionInput
          const taskDescription = taskDescriptionInput.value.trim();

          if (taskDescription !== '') {
            taskDescriptionToSave = taskDescription; // Store description temporarily
            if (modal) modal.style.display = "none"; // Close modal
            enterSelectionMode(); // Enter selection mode

            // Clear the input field - use the globally assigned variable
            if (taskDescriptionInput) taskDescriptionInput.value = '';

          } else {
            alert('Please enter a task description.');
          }
        });
    }

    // Combine all info panel click handling into a single delegated listener
    if (infoPanel && !infoPanel._combinedClickListenerAttached) {
        infoPanel.addEventListener('click', (event) => {
            const removeButton = event.target.closest('.remove-task-button');
            const deleteAllButton = event.target.closest('#deleteAllTasksButton');
            const listItem = event.target.closest('li');
             const isCheckboxClick = event.target.tagName === 'INPUT' && event.target.type === 'checkbox';

            if (removeButton) {
                // Single task removal logic
                // Get the parent list item
                const listItemToRemove = removeButton.closest('li');

                if (listItemToRemove) {
                    // Get task details from data attributes on the list item
                    const taskDescription = listItemToRemove.dataset.description;
                    const taskType = listItemToRemove.dataset.type;
                    const taskDate = listItemToRemove.dataset.date;
                    const taskDayOfWeek = listItemToRemove.dataset.dayofweek;

                    // Find the index of the task to remove
                    const taskIndexToRemove = tasks.findIndex(task => {
                        if (task.type === 'one-time' && taskType === 'one-time') {
                            return task.description === taskDescription &&
                                   task.type === taskType &&
                                   task.date === taskDate;
                        } else if (task.type === 'weekly' && taskType === 'weekly') {
                            return task.description === taskDescription &&
                                   task.type === taskType &&
                                   task.dayOfWeek == parseInt(taskDayOfWeek);
                        }
                        return false;
                    });

                    if (taskIndexToRemove !== -1) {
                        // Remove the task from the array
                        tasks.splice(taskIndexToRemove, 1);

                        // Explicitly update the indicator for the selected day *before* saving and regenerating the calendar.
                        // This might help ensure the correct state is evaluated for the specific day after deletion.
                         if (selectedDateForPanel) {
                             updateDayIndicatorColor(selectedDateForPanel);
                         }

                        saveCalendarTasks(); // Save the updated tasks array (also regenerates calendar)

                        // Refresh the info panel for the currently selected day using the stored date
                        if (selectedDateForPanel) {
                            updateInfoPanel(selectedDateForPanel);
                        } else {
                            // If no day is selected, clear the info panel or show a default message
                            const infoPanelTitle = document.querySelector('#infoPanel h2');
                            const infoPanel = document.getElementById('infoPanel');
                             if (infoPanelTitle) infoPanelTitle.textContent = 'Information';
                             if (infoPanel) infoPanel.innerHTML = '<h2>Information</h2><p>Details about selected dates or tasks will appear here.</p>';
                        }

                        // The calendar is fully regenerated by saveCalendarTasks, which updates all indicators.
                        // The explicit call above is an attempt to reinforce the update for the specific day.
                    }
                }
            } else if (deleteAllButton) {
                 // Delete all tasks for the currently selected day using the stored date
                 if (selectedDateForPanel) {

                     // Filter out tasks for the clicked day
                     tasks = tasks.filter(task => {
                        const taskDate = new Date(task.date);
                        if (task.type === 'one-time') {
                            return taskDate.toDateString() !== selectedDateForPanel.toDateString();
                        } else if (task.type === 'weekly') {
                            return !(task.dayOfWeek === selectedDateForPanel.getDay() && taskDate <= selectedDateForPanel);
                        }
                        return true; // Keep tasks that are neither one-time nor matching weekly for this day
                     });

                     saveCalendarTasks(); // Save and regenerate calendar

                     // Refresh the info panel for the now empty day using the stored date
                     updateInfoPanel(selectedDateForPanel);
                     console.log('All tasks removed for ', selectedDateForPanel.toDateString());

                     // Update the calendar indicator color after deletion
                     updateDayIndicatorColor(selectedDateForPanel);

                 } else {
                      // If no day is selected, clear the info panel or show a default message
                      const infoPanelTitle = document.querySelector('#infoPanel h2');
                      const infoPanel = document.getElementById('infoPanel');
                       if (infoPanelTitle) infoPanelTitle.textContent = 'Information'; // Or a default date like today?
                       if (infoPanel) infoPanel.innerHTML = '<h2>Information</h2><p>Details about selected dates or tasks will appear here.</p>'; // Keep initial structure
                 }
             } else if (listItem && !removeButton && !deleteAllButton && !isCheckboxClick) { // Handle click on list item (excluding direct checkbox clicks and buttons)
                 // Find the checkbox within the list item
                 const checkbox = listItem.querySelector('input[type="checkbox"]');
                 if (checkbox) {
                     // Manually toggle the checkbox state - this will trigger the 'change' event
                     checkbox.checked = !checkbox.checked;
                     // Explicitly dispatch a change event to ensure the listener is triggered
                     const changeEvent = new Event('change', { bubbles: true });
                     checkbox.dispatchEvent(changeEvent);
                 }
             }
             // Note: Direct clicks on the checkbox will be handled by the separate change listener
        });
        infoPanel._combinedClickListenerAttached = true; // Mark listener as attached
    }

    // Add event listener for checkbox state changes using event delegation
    // Ensure this is assigned only once
    if (infoPanel && !infoPanel._checkboxChangeListenerAttached) {
        infoPanel.addEventListener('change', (event) => {
             const checkbox = event.target;
             // Check if the changed element is a checkbox within a list item
             const listItem = checkbox.closest('li');

             if (checkbox.tagName === 'INPUT' && checkbox.type === 'checkbox' && listItem) {
                 // Find the corresponding task in the tasks array using data attributes from the li
                 const taskDescription = listItem.dataset.description;
                 const taskType = listItem.dataset.type;
                 const taskDate = listItem.dataset.date;
                 const taskDayOfWeek = listItem.dataset.dayofweek;

                 const taskToUpdate = tasks.find(task => {
                    if (task.type === 'one-time' && taskType === 'one-time') {
                        return task.description === taskDescription &&
                               task.type === taskType &&
                               task.date === taskDate;
                    } else if (task.type === 'weekly' && taskType === 'weekly') {
                         return task.description === taskDescription &&
                                task.type === taskType &&
                                task.dayOfWeek == parseInt(taskDayOfWeek);
                    }
                    return false;
                 });

                if (taskToUpdate) {
                    // Update the completed state based on task type
                    if (taskToUpdate.type === 'one-time') {
                        taskToUpdate.completed = checkbox.checked;
                    } else if (taskToUpdate.type === 'weekly') {
                         const displayDateISO = listItem.dataset.displaydate;
                         if (displayDateISO) {
                             const dateIndex = taskToUpdate.completedDates.indexOf(displayDateISO);
                             if (checkbox.checked && dateIndex === -1) {
                                 // Add date if checked and not already present
                                 taskToUpdate.completedDates.push(displayDateISO);
                             } else if (!checkbox.checked && dateIndex !== -1) {
                                 // Remove date if unchecked and present
                                 taskToUpdate.completedDates.splice(dateIndex, 1);
                             }
                         }
                    }
                    saveCalendarTasks(); // Save the updated tasks array

                    // Update the calendar indicator for the selected day
                    if (selectedDateForPanel) {
                         updateDayIndicatorColor(selectedDateForPanel); // Call a new function to update color
                    }
                    console.log(`Task "${taskDescription}" marked as ${checkbox.checked ? 'completed' : 'pending'}`);
                }
             }
        });
        infoPanel._checkboxChangeListenerAttached = true; // Mark listener as attached
    }

    // Add event listeners for month navigation buttons using event delegation
    // Ensure this is attached only once
    if (calendarContainer && !calendarContainer._monthNavListenerAttached) {
        calendarContainer.addEventListener('click', (event) => {
            const prevMonthButton = event.target.closest('#prevMonthButton');
            const nextMonthButton = event.target.closest('#nextMonthButton');

            if (prevMonthButton) {
                // Decrease month, adjust year if needed
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11; // December
                    currentYear--;
                }
                generateCalendar(); // Regenerate calendar for the new month/year
                // Note: Listeners for day/weekday clicks and hover effects are re-attached by addCalendarEventListeners,
                // but the month navigation listener itself is attached here once.
                addCalendarEventListeners(); // Re-attach other necessary listeners
            }
            else if (nextMonthButton) {
                // Increase month, adjust year if needed
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0; // January
                    currentYear++;
                }
                generateCalendar(); // Regenerate calendar for the new month/year
                // Note: Listeners for day/weekday clicks and hover effects are re-attached by addCalendarEventListeners,
                // but the month navigation listener itself is attached here once.
                addCalendarEventListeners(); // Re-attach other necessary listeners
            }
        });
        calendarContainer._monthNavListenerAttached = true; // Mark listener as attached
    }

    // Automatically select the current day and display its info on load
    const today = new Date();
    // Get the displayed month and year from the calendar header
    const calendarTitleElement = calendarContainer.querySelector('h2');
    if (calendarTitleElement) {
        const [monthName, year] = calendarTitleElement.textContent.split(' ');
        const displayedMonth = monthNames.indexOf(monthName);
        const displayedYear = parseInt(year);

        // Check if the current calendar view is the current month and year
        if (displayedMonth === today.getMonth() && displayedYear === today.getFullYear()) {
            // Find the day element for the current day of the month
            const dayElements = calendarContainer.querySelectorAll('.calendar-grid .calendar-day:not(.empty-day)');
            let currentDayElement = null;
            dayElements.forEach(dayElement => {
                if (parseInt(dayElement.textContent) === today.getDate()) {
                    currentDayElement = dayElement;
                }
            });

            if (currentDayElement) {
                // Add the 'selected-day' class to highlight it
                currentDayElement.classList.add('selected-day');

                // Set the global selected date variable
                selectedDateForPanel = today;

                // Update the info panel for the current day
                updateInfoPanel(selectedDateForPanel);
            }
        }
    }

}); // End of DOMContentLoaded listener

// Function to save tasks to localStorage
function saveCalendarTasks() {
  localStorage.setItem('calendarTasks', JSON.stringify(tasks));
  // After saving, regenerate the calendar to show the new task indicators
  generateCalendar();
}

// Function to load tasks (placeholder - displaying on calendar is next)
function loadCalendarTasks() {
    tasks = JSON.parse(localStorage.getItem('calendarTasks')) || [];
    // Ensure all loaded tasks have a 'completed' property and weekly tasks have completedDates
    tasks.forEach(task => {
        if (task.completed === undefined) {
            task.completed = false;
        }
        if (task.type === 'weekly' && task.completedDates === undefined) {
            task.completedDates = [];
        }
    });
    // Logic to display tasks on the calendar will go here later
    // Generate calendar after loading tasks
    generateCalendar();
}

// Function to update the info panel for a given date
function updateInfoPanel(date) {
     const options = { year: 'numeric', month: 'long', day: 'numeric' };
     const infoPanelTitle = document.querySelector('#infoPanel h2');
     if (infoPanelTitle) infoPanelTitle.textContent = date.toLocaleDateString(undefined, options);

     const infoPanel = document.getElementById('infoPanel');
     let tasksListHTML = '';

     // Find tasks for the given day
     const tasksForClickedDay = tasks.filter(task => {
         const taskDate = new Date(task.date);
         if (task.type === 'one-time') {
             return taskDate.toDateString() === date.toDateString();
         } else if (task.type === 'weekly') {
             return task.dayOfWeek === date.getDay() && taskDate <= date;
         }
         return false;
     });

     if (tasksForClickedDay.length > 0) {
         tasksListHTML += '<h3>Tasks:</h3><ul>';
         tasksForClickedDay.forEach(task => {
             // Add a clickable span for removing the task
             // Add a checkbox before the task description, set checked state
             let isChecked = '';
             if (task.type === 'one-time') {
                 isChecked = task.completed ? 'checked' : '';
             } else if (task.type === 'weekly') {
                  // For weekly tasks, check if the specific date is in completedDates
                  isChecked = task.completedDates.includes(date.toISOString()) ? 'checked' : '';
             }
             // Store task identifier data attributes on the li itself for easier access
             // Also store the specific date for weekly tasks in a data attribute
             const taskDateISO = task.date || ''; // Use empty string if date is undefined
             const listItemDataAttributes = `data-description="${task.description}" data-type="${task.type}" data-date="${taskDateISO}" data-dayofweek="${task.dayOfWeek !== undefined ? task.dayOfWeek : ''}" data-displaydate="${date.toISOString()}"`;

             tasksListHTML += `<li ${listItemDataAttributes} class="${isChecked ? 'completed-task' : ''}"><input type="checkbox" ${isChecked}> ${task.description} (${task.type}) <span class="remove-task-button">&times;</span></li>`;
         });
         tasksListHTML += '</ul>';
         // Add Delete All Tasks button
         tasksListHTML += '<button id="deleteAllTasksButton">Delete All Tasks for this Day</button>';
     } else {
         tasksListHTML += '<p>No tasks for this day.</p>';
     }

     // Update the info panel content (keeping the title)
     if (infoPanel) {
         // Assuming the H2 is the first child of infoPanel
         while (infoPanel.children.length > 1) {
           infoPanel.removeChild(infoPanel.lastChild);
         }
         infoPanel.innerHTML += tasksListHTML;
     }
}

// Function to check if a day has tasks and update its indicator color
function updateDayIndicatorColor(date) {
    const calendarTitle = calendarContainer.querySelector('h2').textContent.split(' ');
    const currentYear = parseInt(calendarTitle[1]);
    const currentMonth = monthNames.indexOf(calendarTitle[0]);
    const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDayOfCurrentMonth.getDay();
    const dayOfMonth = date.getDate();

    const nthChildIndex = 7 + startingDayOfWeek + dayOfMonth;
    const updatedDayElement = calendarContainer.querySelector('.calendar-grid .calendar-day:nth-child(' + nthChildIndex + ')');

    if (updatedDayElement) {
         // --- Ensure existing indicator and color classes are removed first ---
         updatedDayElement.classList.remove('has-tasks', 'all-tasks-completed');
         const existingIndicator = updatedDayElement.querySelector('.task-indicator');
         if (existingIndicator) { existingIndicator.remove(); }
         // ------------------------------------------------------------------

         // Find tasks for this day
         const tasksForDay = tasks.filter(task => {
             const taskDate = new Date(task.date);
             if (task.type === 'one-time') {
                 return taskDate.toDateString() === date.toDateString();
             } else if (task.type === 'weekly') {
                 return task.dayOfWeek === date.getDay() && taskDate <= date;
             }
             return false;
         });

          if (tasksForDay.length > 0) {
               // Add the indicator dot
               // Remove any existing indicator before adding a new one
               const existingIndicator = updatedDayElement.querySelector('.task-indicator');
               if (existingIndicator) { existingIndicator.remove(); }

               const taskIndicator = document.createElement('div');
               taskIndicator.classList.add('task-indicator');
               updatedDayElement.appendChild(taskIndicator);

               // Check if all tasks for this day are completed, considering task type
               const allTasksCompleted = tasksForDay.every(task => {
                   if (task.type === 'one-time') {
                       return task.completed;
                   } else if (task.type === 'weekly') {
                        // Check if the current date (for the day being generated) is in the completedDates array
                        return task.completedDates.includes(date.toISOString());
                   }
                   return false; // Should not happen
               });

               // Remove any existing color classes before adding the correct one
               updatedDayElement.classList.remove('has-tasks', 'all-tasks-completed');

               if (allTasksCompleted) {
                    updatedDayElement.classList.add('all-tasks-completed'); // Add green class
                } else {
                     updatedDayElement.classList.add('has-tasks'); // Add yellow class
                 }
           } else {
               // No tasks for this day
           }
    }
} 