

/*








var dropZone = document.getElementById('dropZone');

function showDropZone() {
    dropZone.style.visibility = "visible";
}
function hideDropZone() {
    dropZone.style.visibility = "hidden";
}

function allowDrag(e) {
    if (true) {  // Test that the item being dragged is a valid one
        e.dataTransfer.dropEffect = 'copy';
        e.preventDefault();
    }
}

function handleDrop(e) {
    e.preventDefault();
    hideDropZone();

    console.log('Drop!');
    
    console.log(e);
    
    var data = e.dataTransfer.getData("text");
	console.log(data);
 
}

// 1
window.addEventListener('dragenter', function(e) {
    showDropZone();
});

// 2
dropZone.addEventListener('dragenter', allowDrag);
dropZone.addEventListener('dragover', allowDrag);

// 3
dropZone.addEventListener('dragleave', function(e) {
    hideDropZone();
});

// 4
dropZone.addEventListener('drop', handleDrop);


*/