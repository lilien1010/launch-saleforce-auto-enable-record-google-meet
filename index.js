// ==UserScript==
// @name         Auto Enable Record for Saleloft Meeting
// @namespace    your-namespace
// @version      1.0
// @description  When detect Edit alternative logging selections auto click Video call options and enable record
// @match        *://meet.google.com/calendar*
// @match        *://calendar.google.com/calendar/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    // Generic button finding function
    function findButton(buttonLabel,element = 'button',field = 'aria-label') {
        const button = Array.from(document.querySelectorAll(element)).find(button =>
            button.getAttribute(field)?.includes(buttonLabel)
        );
        if (button) {
            console.log(`Found button: ${buttonLabel}`);
        }
        return button;
    }

    // Generic function to click button and execute callback
    function clickButton(button, callback = null) {
        if (!button) {
            console.error('Attempted to click null button');
            return;
        }

        setTimeout(() => {
            try {
                button.click();
                console.log(`Clicked button: ${button.getAttribute('aria-label')}`);
                if (callback) {
                    setTimeout(callback, 100); // Delay callback execution
                }
            } catch (error) {
                console.error('Error clicking button:', error);
            }
        }, 100);
    }

    // Main page configuration functionality
    function setupMainPageConfig() {
        let editButtonFound = false;
        console.log('Setting up main page config...');

        const observer = new MutationObserver((mutations) => {
            // 1. Find div aria-label = "Guests invited to this event"
            const guestsDiv = findButton('Guests invited to this event', 'div', 'aria-label');
            console.log('main page edited, guestsDiv found:', guestsDiv);

            if (guestsDiv && !editButtonFound) {
                console.log('Found "Guests invited to this event", checking child divs for data-email');
                
                // Check child div data-email attributes
                const childDivs = guestsDiv.querySelectorAll('div[data-email]');
                let hasNonShopifyEmail = false;
                
                childDivs.forEach(childDiv => {
                    const email = childDiv.getAttribute('data-email');
                    console.log('Checking email:', email);
                    if (email && !email.includes('shopify.com')) {
                        hasNonShopifyEmail = true;
                        console.log('Found non-shopify.com email, will not proceed with video options');
                    }
                });

                // Only continue if no shopify.com emails are found
                if (hasNonShopifyEmail) {
                    console.log('Some non-shopify.com emails found, checking for Video call options');
                    const videoOptionsButton = findButton('Video call options');
                    
                    if (videoOptionsButton) {
                        editButtonFound = true;
                        console.log('Found "Video call options", proceeding to click');
                        clickButton(videoOptionsButton);
                        observer.disconnect();
                        console.log('Observer disconnected after finding both conditions met');
                    }
                } else {
                    console.log('Shopify.com email detected, skipping video options setup');
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-label', 'data-email']
        });

        console.log('Main page observer started');
    }

    // Settings page automation configuration
    function setupSettingsPageConfig() {
        console.log('Setting up settings page config...');
        const observer = new MutationObserver((mutations) => {
            const meetingRecordsButton = findButton('Meeting records');
            if (meetingRecordsButton) {
                observer.disconnect();
                clickButton(meetingRecordsButton, ()=>{
                  setTimeout(setupRecordingToggle,20)
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-label']
        });
    }

    // Configure recording options
    function setupRecordingToggle() {
        const checkbox = Array.from(document.querySelectorAll('input')).find(input =>
            input.getAttribute('aria-label')?.includes('Record the meeting')
        );
        console.log('Setting up recording toggle...,',checkbox);
        if (checkbox) {
            console.log('Found recording checkbox, checked:', checkbox.checked);
            if (!checkbox.checked) {
                clickButton(checkbox, setupSaveButton);
            }
        }

    }

    // Setup save button
    function setupSaveButton() {
        console.log('Setting up save button...');
            const saveSpan = Array.from(document.querySelectorAll('span'))
                .find(span => span.textContent === 'Save');
            const saveButton = saveSpan?.closest('div')?.querySelector('button');

            if (saveButton) {
                clickButton(saveButton, () => {
                    console.log('Configuration saved successfully');
                });
            }
    }

    // Main entry point: decide which configuration flow to execute based on URL
    function init() {
        console.log("Script initialized on:", document.URL);

        // Add error handling
        try {
            if (document.URL.includes('calendarsettings')) {
                setupSettingsPageConfig();
            } else {
                setupMainPageConfig();
            }
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    // Start the script
    init();
})();
