import network
import urequests
from machine import Pin, PWM
import time
from makeblock_sensors import UltrasonicSensor, LineSensor

# Initialize motors, sensors, and mode variables
left_motor = PWM(Pin(0))
right_motor = PWM(Pin(1))
ultrasonic_sensor = UltrasonicSensor(Pin(2))
line_sensor = LineSensor(Pin(3))

line_following_enabled = False
remote_control_active = False

# Basic movement speeds
FORWARD_SPEED = 50
TURN_SPEED = 70

# Add your Wi-Fi credentials
WIFI_SSID = 'your_wifi_ssid'
WIFI_PASSWORD = 'your_wifi_password'

# Set your server URL
SERVER_URL = 'http://your_server_url'

# Connect to Wi-Fi at the start
connect_to_wifi(WIFI_SSID, WIFI_PASSWORD)


def connect_to_wifi(ssid, password):
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Connecting to network...")
        wlan.connect(ssid, password)
        while not wlan.isconnected():
            pass
    print("Connected to Wi-Fi")
    return wlan

def get_remote_command():
    try:
        response = urequests.get(SERVER_URL)
        if response.status_code == 200:
            return response.text
        else:
            return None
    except Exception as e:
        print("Error: ", e)
        return None


def drive(speed_left, speed_right):
    left_motor.duty(speed_left)
    right_motor.duty(speed_right)

def stop():
    drive(0, 0)

def forward():
    drive(FORWARD_SPEED, FORWARD_SPEED)

def backward():
    drive(-FORWARD_SPEED, -FORWARD_SPEED)

def turn_left():
    drive(0, TURN_SPEED)

def turn_right():
    drive(TURN_SPEED, 0)

def remote_control(command):
    global line_following_enabled, remote_control_active
    # Check for obstacles
    if ultrasonic_sensor.read_distance() < 20:
        stop()
        return

    if command == "stop":
        stop()
        remote_control_active = False
    elif command == "forward":
        forward()
    elif command == "backward":
        backward()
    elif command == "left":
        turn_left()
    elif command == "right":
        turn_right()
    elif command == "enable_line_following":
        line_following_enabled = True
    elif command == "disable_line_following":
        line_following_enabled = False
    else:
        remote_control_active = True


def avoid_obstacles():
    distance = ultrasonic_sensor.read_distance()
    if distance < 20:  # distance in cm
        stop()
        # Implement obstacle avoidance behavior
    else:
        drive(50, 50)  # Continue forward

def follow_line():
    if line_sensor.detect_line():
        # Adjust motor speeds to follow the line
        pass


while True:
    command = get_remote_command()  # Implement a method to get remote commands

    if command:
        remote_control(command)

    if remote_control_active:
        # Continue executing the last movement command
        pass
    elif line_following_enabled:
        avoid_obstacles()
        follow_line()
    else:
        stop()  # Stop if no commands are received

    time.sleep(0.1)
