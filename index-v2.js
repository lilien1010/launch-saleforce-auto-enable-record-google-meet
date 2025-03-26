// ==UserScript==
// @name         Auto Enable Record for Saleloft Meeting V2
// @namespace    your-namespace
// @version      1.0
// @description  When detect Edit alternative logging selections auto click Video call options and enable record
// @match        *://meet.google.com/calendar*
// @match        *://calendar.google.com/calendar/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {

    let timerOpenIframe = null;
    let timerToPanel = null;
    let timerClickEnable = null;

    function findAndClickButton(buttonLabel, preTimer, callback = null) {
        const videoOptionsButton = Array.from(document.querySelectorAll('button')).find(button =>
            button.getAttribute('aria-label') === buttonLabel
        );

        if (videoOptionsButton) {
            if (preTimer) {
                setTimeout(() => {
                    videoOptionsButton.click();
                    console.log(buttonLabel, " Button clicked");
                }, 1);
                clearInterval(preTimer)
            }
            if (callback) {
                callback(videoOptionsButton)
            }
        }
    }


    const funcToOpenConfigPage = () => {
        // as long as found salesloft conect button then we auto enable record
        findAndClickButton('Edit alternative logging selections', null, () => {
            console.log('find salesloft enabled')
            findAndClickButton('Video call options', timerOpenIframe)
        });

        console.log('funcToOpenConfigPage ');
    }


    const funcToToggleEnableAuthRecords = () => {
        // find the record the meeting label to enable
        const label = Array.from(document.querySelectorAll('input')).find(button => {
            return button.getAttribute('aria-label') === "Starts recording audio and video of the meeting for later playback when someone who has the right to record joins the meeting. The recording will be stored in the organizer's Google Drive.";
        });
        console.log('funcToToggleEnableAuthRecords', label.checked);
        if (label && !label.checked) {
            setTimeout(() => {
                label.click()
            }, 10)
            setTimeout(() => {
                const saveBtn = Array.from(document.querySelectorAll('span')).find(button => {
                    return button.textContent === 'Save';
                });

                const saveBtnReal = saveBtn?.closest('div')?.querySelector('button')
                console.log('funcToToggleEnableAuthRecords saveBtnReal ', saveBtnReal);
                console.log('funcToToggleEnableAuthRecords saveBtn ', saveBtn);
                if (saveBtnReal) {
                    setTimeout(() => {
                        saveBtnReal.click()
                        sessionStorage.setItem('settedByBot', new Date().getTime())
                    }, 10)
                    clearInterval(timerClickEnable)
                }
            }, 100)
        }
    }

    const funcToOpenEnablePannel = () => {
        // click to open the Meeting records pannel
        const lastClick = sessionStorage.getItem("settedByBot");
        if (lastClick && new Date().getTime() - lastClick < 1 * 60 * 1000) {
            console.log('second round of config,skip', lastClick);
            clearInterval(timerToPanel);
            return;
        }
        findAndClickButton('Meeting records', timerToPanel, (meetingPanel) => {
            console.log('funcToOpenEnablePannel', meetingPanel);
            timerClickEnable = setInterval(funcToToggleEnableAuthRecords, 500)
        })
    }

    if (document.URL.includes('calendarsettings')) {
        // enter to iframe of setting page
        timerToPanel = setInterval(funcToOpenEnablePannel, 1000)
    } else {
        // enter the main page keep checking
        timerOpenIframe = setInterval(funcToOpenConfigPage, 3000)
    }



    console.log("inject to iframe", document.URL)
})()
