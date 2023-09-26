// ==UserScript==
// @name         Quizizz GPT
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  integrates ChatGPT with Quizizz to answer questions
// @author       RannStudio
// @match        *://quizizz.com/join
// @match        *://quizizz.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=quizizz.com
// @grant        none
// @unwrap
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// ==/UserScript==

(function() {
    'use strict'

    const get_question = () => {
        const question = document.getElementsByClassName('question-text-color')[0].textContent
        return question
    }

    const get_answer = () => {
        let answer = []
        try {
            const answer_container = document.getElementsByClassName('options-grid')[0]
            const answer_elements = answer_container.getElementsByClassName('option')
            for (var i = 0; i < answer_elements.length; i++) {
                answer.push(answer_elements[i].textContent)
            }
        } catch(err) {
            answer = null
        }
        return answer
    }

    const digestMessage = async(r) => {
        const e = new TextEncoder().encode(r)
        , t = await crypto.subtle.digest("SHA-256", e);
        return Array.from(new Uint8Array(t)).map(a=>a.toString(16).padStart(2, "0")).join("")
    }

    const generateSignature = async r=>{
        const {t: e, m: t} = r
        , n = {}.PUBLIC_SECRET_KEY || ""
        , a = `${e}:${t}:${n}`;
        return await digestMessage(a)
    }

    const solve_question = async () => {
        try {
            const question = await get_question();
            const answer = await get_answer();
            let content;
            if (answer) {
                const choices = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                content = `Answer these questions and choose the correct answer:\nquestion:\n${question}\nanswer: ${answer.map((ans, index) => `${choices[index]}. ${ans}`).join('\n')}`;
            } else {
                content = `Answer this question briefly:\nquestion:\n${question}`;
            }
            const time = +new Date();
            const data = {
                messages: [{
                    role: "user",
                    content: content
                }],
                time: time,
                pass: null,
                sign: await generateSignature({
                    t: time,
                    m: content
                })
            };

            const response = await $.ajax({
                url: 'https://cors-proxy.rann-studio.repl.co',
                method: 'POST',
                data: {
                    url: 'https://chaty.free2gpt.xyz/api/generate',
                    data: JSON.stringify(data),
                }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    function handleKeyRelease(event) {
        if (event.key === "Insert") {
            Swal.fire({
                html: 'Loading, please wait...',
                allowEscapeKey: false,
                allowOutsideClick: false,
                didOpen: async () => {
                    Swal.showLoading();
                    try {
                        const response = await solve_question();
                        Swal.fire({
                            html: response
                        });
                    } catch (error) {
                        if (error.message) {
                            Swal.fire('Oops!', error.message, 'error');
                        } else {
                            Swal.fire('Oops!', 'Something went wrong', 'error');
                        }
                    }
                }
            });
        }
    }
    document.addEventListener("keyup", handleKeyRelease);

    function checkServerStatus() {
        $.ajax({
            url: 'https://cors-proxy.rann-studio.repl.co',
            method: 'GET',
            success: function() {
                Swal.fire({
                    title: 'Quizizz GPT',
                    html: '<p style="text-align: left;">Please be advised that the responses generated by this bot may not always be accurate. Additionally, this bot is unable to interpret images.</p><br>' +
                    '<p style="text-align: left;"><b>How to Use:</b></p>' +
                    '<p style="text-align: left;">Press the "Insert" key on your keyboard to retrieve an answer.</p>'
                })
            },
            error: function() {
                Swal.fire({
                    title: 'Quizizz GPT',
                    html: 'server is currently waking up, please wait...',
                    timer: 5000,
                    timerProgressBar: true,
                    didOpen: () => {
                        Swal.showLoading()
                    }
                })
                setTimeout(checkServerStatus, 5000);
            }
        });
    }

    function waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    waitForElm('.pause-icon').then((elm) => {
        checkServerStatus();
    });
})();
