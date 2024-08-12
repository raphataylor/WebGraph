console.log("Index.html loaded");
window.addEventListener("load", function() {
    console.log("Window loaded");
    if (document.getElementById('root').children.length === 0) {
        console.error("React app not rendered");
    } else {
        console.log("React app rendered");
    }
});