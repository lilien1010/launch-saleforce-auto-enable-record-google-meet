// ==UserScript==
// @name         Google Meet One-Click Recording for Salesloft (Permission Ask Style)
// @namespace    your-namespace
// @version      1.1
// @description  Adds a button to Google Meet to start recording with captions and transcript for Salesloft, only if the main UI isn't fully loaded.
// @match        *://meet.google.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const CHECK_INTERVAL = 2000; // Check every 2 seconds
    const BUTTON_ID = 'salesloft-record-button-ask';
    let recordButton = null;
    let checkIntervalId = null;
    let initialCheckDone = false;

    // Helper function to find an element, with optional waiting
    function findElement(selector, textContent = null, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const interval = setInterval(() => {
                let element = null;
                if (textContent) {
                    // Find element by selector and text content (case-insensitive, trimmed)
                    element = Array.from(document.querySelectorAll(selector)).find(el => el.textContent.trim().toLowerCase() === textContent.toLowerCase());
                } else {
                    element = document.querySelector(selector);
                }

                if (element) {
                    clearInterval(interval);
                    console.log(`[SF Record Ask] Found element: ${selector} ${textContent || ''}`);
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    // Don't reject immediately, maybe it's okay if not found in some cases
                    console.warn(`[SF Record Ask] Element not found within ${timeout}ms: ${selector} ${textContent || ''}`);
                    resolve(null); // Resolve with null instead of rejecting
                }
            }, 200); // Check frequently
        });
    }

    // Helper function to click an element safely
    function clickElement(element, delay = 100) {
         if (!element) {
            console.error('[SF Record Ask] Attempted to click null element');
            return Promise.resolve(); // Resolve gracefully if element is null
        }
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    console.log(`[SF Record Ask] Clicking element:`, element.tagName, element.ariaLabel || element.textContent?.trim());
                    element.click();
                    resolve();
                } catch (error) {
                    console.error('[SF Record Ask] Error clicking element:', element, error);
                    reject(error); // Reject if click fails
                }
            }, delay);
        });
    }

     // Function to find a label/container and click its associated input/control (checkbox/radio/switch)
    async function clickToggleOption(textOrLabel, desiredState = true, delay = 150) {
        console.log(`[SF Record Ask] Looking for option toggle: "${textOrLabel}" (desired state: ${desiredState})`);
        try {
            // Try finding by aria-label on button/div first (common pattern)
            let control = document.querySelector(`[role="checkbox"][aria-label*="${textOrLabel}"], [role="switch"][aria-label*="${textOrLabel}"]`);

            // If not found by aria-label, try finding span/div containing text and look for a control nearby
            if (!control) {
                 const elementContainingText = Array.from(document.querySelectorAll('span, div, label')).find(el => el.textContent.includes(textOrLabel));
                 if (elementContainingText) {
                     // Find the closest checkbox/switch role element
                    control = elementContainingText.closest('[role="checkbox"], [role="switch"]');
                    // Or maybe an input checkbox directly associated
                    if (!control && elementContainingText.tagName === 'LABEL' && elementContainingText.getAttribute('for')) {
                        control = document.getElementById(elementContainingText.getAttribute('for'));
                    }
                    // Or maybe an input checkbox nested inside
                    if (!control) {
                       control = elementContainingText.querySelector('input[type="checkbox"]');
                    }
                 }
            }

            if (control) {
                 console.log(`[SF Record Ask] Found control for "${textOrLabel}":`, control);
                 const currentState = control.checked || control.getAttribute('aria-checked') === 'true';
                 console.log(`[SF Record Ask] Control "${textOrLabel}" current state: ${currentState}. Desired: ${desiredState}`);
                 if (currentState !== desiredState) {
                    await clickElement(control, delay);
                 } else {
                    console.log(`[SF Record Ask] Control "${textOrLabel}" already in desired state.`);
                 }
            } else {
                console.warn(`[SF Record Ask] Could not find toggle control for: "${textOrLabel}"`);
            }
        } catch (error) {
            console.error(`[SF Record Ask] Error processing toggle "${textOrLabel}":`, error);
        }
    }


    // Main action sequence when the button is clicked
    async function startRecordingProcess() {
        console.log("[SF Record Ask] Starting recording process via button click...");
        // Disable button temporarily
        if(recordButton) recordButton.disabled = true;

        try {
            const moreOptionsButton = await findElement('button[aria-label="More options"]', null, 3000);
            if (!moreOptionsButton) throw new Error("'More options' button not found when needed.");
            await clickElement(moreOptionsButton);

            // Find "Manage recording" - could be span or div text
            const manageRecordingElement = await findElement('span, div', 'Manage recording', 3000); // Wait for menu
            if (!manageRecordingElement) throw new Error("'Manage recording' text not found.");
            // The clickable element is likely the parent div with role="menuitem"
            const manageRecordingContainer = manageRecordingElement.closest('[role="menuitem"]');
            if (!manageRecordingContainer) throw new Error("Could not find clickable container for 'Manage recording'");
            await clickElement(manageRecordingContainer, 200);

            // Wait for the recording dialog/options to appear - increase delay slightly
             await new Promise(resolve => setTimeout(resolve, 600));

             // Click toggles using the helper function
             await clickToggleOption('Include captions in the recording', true, 150);
             await clickToggleOption('Also start a transcript', true, 150); // Wording might vary slightly


            // Find and click the final "Start recording" button
            // It's usually a button containing a span with the text.
             const startRecordingSpan = await findElement('span', 'Start recording', 3000);
             if (!startRecordingSpan) throw new Error("'Start recording' text not found.");
             const startButton = startRecordingSpan.closest('button');
             if (!startButton) throw new Error("Could not find 'Start recording' button container.");

            await clickElement(startButton, 200);

            console.log("[SF Record Ask] Recording process initiated via button.");
            // Remove the button after successful initiation
            if (recordButton) {
                recordButton.remove();
                recordButton = null;
                console.log("[SF Record Ask] Salesloft record button removed after triggering.");
            }
             // Stop the interval check as well
             if (checkIntervalId) {
                clearInterval(checkIntervalId);
                checkIntervalId = null;
            }

        } catch (error) {
            console.error("[SF Record Ask] Error during recording process:", error);
            alert("Error starting recording. Check console for details. You might need to do it manually."); // Notify user
            // Re-enable button on error
             if(recordButton) recordButton.disabled = false;
        }
    }

    // Creates and adds the floating button
    function addRecordButton() {
        if (document.getElementById(BUTTON_ID)) {
            return; // Already added
        }

        console.log("[SF Record Ask] Adding 'Record This Meeting for Salesloft?' button...");
        recordButton = document.createElement('button');
        recordButton.id = BUTTON_ID;
        recordButton.textContent = 'Record This Meeting for Salesloft?';
        // Styling for visibility
        recordButton.style.position = 'fixed';
        recordButton.style.top = '70px';
        recordButton.style.right = '20px';
        recordButton.style.zIndex = '10000'; // High z-index
        recordButton.style.padding = '12px 18px';
        recordButton.style.backgroundColor = '#d93025'; // Google Red
        recordButton.style.color = 'white';
        recordButton.style.border = 'none';
        recordButton.style.borderRadius = '8px';
        recordButton.style.fontSize = '14px';
        recordButton.style.fontWeight = 'bold';
        recordButton.style.cursor = 'pointer';
        recordButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        recordButton.style.textAlign = 'center';

        recordButton.addEventListener('click', startRecordingProcess);

        document.body.appendChild(recordButton);
        console.log("[SF Record Ask] 'Record This Meeting for Salesloft?' button added.");
    }

    // Initial check and setup logic based on requirement 1 & 2
    function initialCheck() {
        console.log("[SF Record Ask] Performing initial check...");
        const moreOptionsButton = document.querySelector('i[aria-label="More options"]');

        if (moreOptionsButton) {
            // Requirement 1 met: "More options" button IS found. Stop.
            console.log("[SF Record Ask] 'More options' button found on initial check. Script will not add the button or proceed further based on requirement 1.");
            // We can stop the interval if it was somehow started
             if (checkIntervalId) {
                clearInterval(checkIntervalId);
                checkIntervalId = null;
            }
        } else {
            // Requirement 1 not met: "More options" button is NOT found. Proceed to step 2.
            console.log("[SF Record Ask] 'More options' button NOT found on initial check. Proceeding to add the button (Requirement 2).");
            addRecordButton();
            // No need for interval checking anymore based on the strict requirement interpretation
        }
        initialCheckDone = true;
    }

    // --- Script Entry Point ---

    console.log("[SF Record Ask] UserScript initializing...");

    // Wait for the page to be somewhat settled before the initial check.
    // Using setTimeout after DOMContentLoaded might be more reliable than just DOMContentLoaded.
    function runInit() {
         if (!initialCheckDone) {
             initialCheck();
         } else {
            console.log("[SF Record Ask] Initial check already performed.");
         }
    }

     if (document.readyState === 'complete') {
        // If already complete, run after a short delay
        setTimeout(runInit, 500);
     } else {
        // Otherwise, wait for the load event
         window.addEventListener('load', () => {
             setTimeout(runInit, 500); // Add a small delay even after 'load'
         });
     }


    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
         if (checkIntervalId) {
            clearInterval(checkIntervalId);
            console.log("[SF Record Ask] Cleared check interval on page unload.");
         }
         if (recordButton) {
            recordButton.remove(); // Clean up button if user navigates away
            console.log("[SF Record Ask] Removed button on page unload.");
         }
    });

})();