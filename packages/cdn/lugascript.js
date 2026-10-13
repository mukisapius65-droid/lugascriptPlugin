// Lugascript CDN Plugin – loads core 
// from jsDelivr, exposes 
// window.Lugascript
(function() { const CORE_URL = 
    'https://cdn.jsdelivr.net/gh/mukisapius65-droid/lugascriptPlugin@main/core/lugascript-core.js'; 
    const script = 
    document.createElement('script'); 
    script.src = CORE_URL; 
    script.onload = function() {
        window.Lugascript = { version: 
            '1.0.0', run: 
            function(source, options = 
            {}) {
                const output = 
                options.container
                    ? (text) => { const 
                        div = 
                        document.createElement('div'); 
                        div.textContent 
                        = text; 
                        options.container.appendChild(div);
                    }
                    : (text) => { if 
                    : (options.console 
                    : !== false) 
                    : console.log(text); 
                    : };
                try { 
                    LugascriptCore.run(source, 
                    output); return { 
                    success: true };
                } catch (err) {
                    if 
                    (options.errorCallback) 
                    options.errorCallback(err.message); 
                    else 
                    console.error(err); 
                    return { success: 
                    false, error: 
                    err.message };
                }
            },
            runScriptTags: function() { 
                document.querySelectorAll('script[type="text/lugascript"]').forEach(s 
                => {
                    window.Lugascript.run(s.textContent);
                });
            }
        };
        if (document.readyState === 
        'loading') {
            document.addEventListener('DOMContentLoaded', 
            () => 
            window.Lugascript.runScriptTags());
        } else {
            window.Lugascript.runScriptTags();
        }
    };
    script.onerror = () => 
    console.error('Failed to load 
    Lugascript core from CDN'); 
    document.head.appendChild(script);
})();
