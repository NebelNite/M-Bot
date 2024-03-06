

document.addEventListener('DOMContentLoaded', function () {
    const leftArea = document.querySelector('.left');
    const rightArea = document.querySelector('.right');
    const forwardArea = document.querySelector('.forward');
    const backwardArea = document.querySelector('.backward');
    const settingsIcon = document.getElementById('settingsIcon');
    const speedSelector = document.getElementById('speedSelector');
    const confirmSpeedBtn = document.getElementById('confirmSpeed');
    const speedSelect = document.getElementById('speed');

    settingsIcon.addEventListener('click', function () {
        speedSelector.style.display = 'block';
    });

    confirmSpeedBtn.addEventListener('click', function () {
        const selectedSpeed = speedSelect.value;
        console.log('Selected Speed:', selectedSpeed);
        speedSelector.style.display = 'none';
    });

    function handleMouseOver(direction) {

        console.log('Mouse Over!');


        const command = {
            direction: direction
        };

        sendMovement(command);

    }

    function handleMouseOut() {
        console.log('Mouse Out!');
        // Hier den Code für 'mouseout' einfügen
    }




    leftArea.addEventListener('mouseover', () => {
        handleMouseOver(3);
    });
    rightArea.addEventListener('mouseover', () => {
        handleMouseOver(1);
    });
    forwardArea.addEventListener('mouseover', () => {
        handleMouseOver(0);
    });
    backwardArea.addEventListener('mouseover', () => {
        handleMouseOver(2);
    });


    leftArea.addEventListener('mouseout', () => {
        handleMouseOut();
    });
    rightArea.addEventListener('mouseout', () => {
        handleMouseOut();
    });
    forwardArea.addEventListener('mouseout', () => {
        handleMouseOut();
    });
    backwardArea.addEventListener('mouseout', () => {
        handleMouseOut();
    });




    
    function sendMovement(command) {

        fetch('/movement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(command)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Server response:', data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }


    confirmSpeedBtn.addEventListener('click', function () {
        const selectedSpeed = speedSelect.value;
        console.log('Selected Speed:', selectedSpeed);
        speedSelector.style.display = 'none';

        sendSpeed(selectedSpeed);
});

    function sendSpeed(speed) {

        const command = {
            speed: speed
        };

        fetch('/speed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(command)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Server response:', data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    
});