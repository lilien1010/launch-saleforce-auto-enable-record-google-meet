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
    // 通用的按钮查找函数
    function findButton(buttonLabel) {
        const button = Array.from(document.querySelectorAll('button')).find(button =>
            button.getAttribute('aria-label') === buttonLabel
        );
        if (button) {
            console.log(`Found button: ${buttonLabel}`);
        }
        return button;
    }

    // 点击按钮并执行回调的通用函数
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
                    setTimeout(callback, 100); // 延迟执行回调
                }
            } catch (error) {
                console.error('Error clicking button:', error);
            }
        }, 100);
    }

    // 主页面配置功能
    function setupMainPageConfig() {
        let editButtonFound = false;
        console.log('Setting up main page config...');

        const observer = new MutationObserver((mutations) => {
            const editButton = findButton('Edit alternative logging selections');
            const videoOptionsButton = findButton('Video call options');

            if (editButton && !editButtonFound) {
                editButtonFound = true;
                console.log('Found "Edit alternative logging selections", checking for Video call options');

                if (videoOptionsButton) {
                    console.log('Found "Video call options", proceeding to click');
                    clickButton(videoOptionsButton);
                    observer.disconnect();
                    console.log('Observer disconnected after finding both buttons');
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-label']
        });

        console.log('Main page observer started');
    }

    // 设置页面的自动化配置
    function setupSettingsPageConfig() {
        const lastClick = sessionStorage.getItem("settedByBot");
        if (lastClick && new Date().getTime() - lastClick < 60000) {
            console.log('Configuration was recently completed, skipping...');
            return;
        }

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

    // 配置录制选项
    function setupRecordingToggle() {
        const checkbox = Array.from(document.querySelectorAll('input')).find(input =>
            input.getAttribute('aria-label')?.includes('Starts recording audio and video of the meeting')
        );
        console.log('Setting up recording toggle...,',checkbox);
        if (checkbox) {
            console.log('Found recording checkbox, checked:', checkbox.checked);
            if (!checkbox.checked) {
                clickButton(checkbox, setupSaveButton);
            }
        }

    }

    // 设置保存按钮
    function setupSaveButton() {
        console.log('Setting up save button...');
            const saveSpan = Array.from(document.querySelectorAll('span'))
                .find(span => span.textContent === 'Save');
            const saveButton = saveSpan?.closest('div')?.querySelector('button');

            if (saveButton) {
                clickButton(saveButton, () => {
                    sessionStorage.setItem('settedByBot', new Date().getTime());
                    console.log('Configuration saved successfully');
                });
            }
    }

    // 主入口：根据URL决定执行哪个配置流程
    function init() {
        console.log("Script initialized on:", document.URL);

        // 添加错误处理
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

    // 启动脚本
    init();
})();