import cyberpi
import time
import socket
import usocket
import machine
import ussl as ssl
import mbot2
import event
import os
import _thread
import mbuild

udp_socket = None  # Initialize the main UDP socket variable
lf_socket = None   # Initialize the line follower UDP socket variable
addr = None
port = 12345  # Define the main port
lf_port = 12346  # Define the line follower port
lineFollowerRunning = False  # Track if the line follower is running
receive_thread_running = True  # Flag to control the receiveServer thread
command_received = False  # Flag to indicate if a command was received
last_action = None  # Track the last action
action_counter = 0  # Count actions for slowing down after turns

def reset_udp_socket(port):
    global udp_socket
    if udp_socket:
        try:
            udp_socket.close()
            cyberpi.console.println('Existing UDP socket closed.')
        except Exception as e:
            cyberpi.console.println('Error closing existing UDP socket: {}'.format(e))
    try:
        udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        udp_socket.bind(('', port))
        cyberpi.console.println('New UDP socket bound to port: {}'.format(port))
    except Exception as e:
        cyberpi.console.println('Error binding new UDP socket: {}'.format(e))

def reset_lf_socket(port):
    global lf_socket
    if lf_socket:
        try:
            lf_socket.close()
            cyberpi.console.println('Existing Line Follower UDP socket closed.')
        except Exception as e:
            cyberpi.console.println('Error closing existing Line Follower UDP socket: {}'.format(e))
    try:
        lf_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        lf_socket.bind(('', port))
        cyberpi.console.println('New Line Follower UDP socket bound to port: {}'.format(port))
    except Exception as e:
        cyberpi.console.println('Error binding new Line Follower UDP socket: {}'.format(e))

def moveForwardW():
    cyberpi.mbot2.drive_power(30, -30)
    global boolDriving
    boolDriving = True

def send_rgb_data():
    global addr, lf_port, command_received
    L2 = cyberpi.quad_rgb_sensor.get_gray('l2', index=1)
    L1 = cyberpi.quad_rgb_sensor.get_gray('l1', index=1)
    R1 = cyberpi.quad_rgb_sensor.get_gray('r1', index=1)
    R2 = cyberpi.quad_rgb_sensor.get_gray('r2', index=1)
    sensor_data = "RGB;L2:{0};L1:{1};R1:{2};R2:{3}".format(L2, L1, R1, R2)
    lf_socket.sendto(sensor_data.encode(), (addr[0], lf_port))
    cyberpi.console.println("Sent sensor data: " + sensor_data)
    command_received = False
    _thread.start_new_thread(resend_check, ())

def resend_check():
    global command_received
    for _ in range(10):  # Check every 0.5 seconds for 5 seconds
        if command_received:
            return
        time.sleep(0.5)
    if not command_received:
        send_rgb_data()

def lineFollower():
    global addr, lf_port, lineFollowerRunning, command_received, last_action, action_counter
    cyberpi.console.println("In: LineFollower")
    lineFollowerRunning = True
    send_rgb_data()  # Send initial RGB sensor data before starting the loop

    while lineFollowerRunning:
        try:
            data, addr = lf_socket.recvfrom(1024)
            command_received = True
            command = data.decode().strip().split(';')[1]  # Split and get the actual command
            cyberpi.console.println("Received command: " + command)
            if command == "FORWARD":
                if last_action in ["LEFT", "RIGHT"]:
                    action_counter += 1
                    if action_counter <= 2:
                        cyberpi.mbot2.drive_power(15, -15)
                    else:
                        cyberpi.mbot2.drive_power(30, -30)
                        action_counter = 0
                else:
                    cyberpi.mbot2.drive_power(30, -30)
                last_action = "FORWARD"
            elif command == "SLIGHT_LEFT":
                cyberpi.mbot2.drive_power(10, -20)
                last_action = "LEFT"
            elif command == "SLIGHT_RIGHT":
                cyberpi.mbot2.drive_power(20, -10)
                last_action = "RIGHT"
            elif command == "HARD_LEFT":
                cyberpi.mbot2.drive_power(5, -25)
                last_action = "LEFT"
            elif command == "HARD_RIGHT":
                cyberpi.mbot2.drive_power(25, -5)
                last_action = "RIGHT"
            elif command == "LEFT":
                cyberpi.mbot2.drive_power(5, -20)
                last_action = "LEFT"
            elif command == "RIGHT":
                cyberpi.mbot2.drive_power(20, -5)
                last_action = "RIGHT"
            elif command == "STOP":
                cyberpi.mbot2.EM_stop(port="all")
                last_action = "STOP"
            time.sleep(0.2)  # Drive for 0.2 seconds
            cyberpi.mbot2.EM_stop(port="all")  # Stop and wait for next command

            send_rgb_data()  # Send new sensor data after executing the command
        except Exception as e:
            cyberpi.console.println("Error receiving UDP command: {}".format(e))

speed = 30  # Set initial speed to a moderate value
boolPrevention = False
boolDriving = False

cyberpi.console.println("Value: ")

angleValue = cyberpi.angle_sensor
rgbValue = cyberpi.dual_rgb_sensor
ultrasonicValue = cyberpi.ultrasonic
flameValue = cyberpi.flame_sensor
tempValue = cyberpi.temp_sensor
soundValue = cyberpi.sound_sensor
ultrasonicValue2 = cyberpi.ultrasonic2
lightValue = cyberpi.light_sensor
magneticValue = cyberpi.magnetic_sensor
soilValue = cyberpi.soil_sensor
rangingValue = cyberpi.ranging_sensor

startUpCounter = cyberpi.timer

cyberpi.led.on(0, 0, 255)

while True:
    try:
        cyberpi.network.config_sta("Oberhuber", "OberPriv2017!")
        if not cyberpi.network.is_connect():
            cyberpi.led.on(255, 0, 0)
            time.sleep(1)
        else:
            cyberpi.led.on(0, 255, 0)
            sockaddr = cyberpi.network.get_ip()
            cyberpi.console.println("IP:")
            cyberpi.console.println(sockaddr)
            break
    except Exception as e:
        cyberpi.console.println("Error connecting to Wi-Fi: {}".format(e))
        time.sleep(1)

subnet = cyberpi.network.get_subnet_mark()
gateway = cyberpi.network.get_gateway()
sockaddr = cyberpi.network.get_ip()

reset_udp_socket(port)
reset_lf_socket(lf_port)

cyberpi.console.println('Listening (UDP)')

while True:
    try:
        data, addr = udp_socket.recvfrom(1024)
        cyberpi.console.println('Nachricht erhalten: {} : {}'.format(addr, data))
        if data.decode() == "MBotDiscovery":
            response_message = "MBotDiscovered"
            udp_socket.sendto(response_message.encode(), (addr[0], port))
            cyberpi.console.println('Serverip: {}'.format(addr[0]))
        elif data.decode() == "Connected to Server":
            cyberpi.console.println('Connected to server!')
            break
    except Exception as e:
        cyberpi.console.println("Error receiving UDP message: {}".format(e))

def preventionMode():
    global boolPrevention
    global speed
    global boolDriving
    cyberpi.console.println(boolPrevention)
    while(boolPrevention):
        cyberpi.console.println(speed)
        distance = cyberpi.ultrasonic2.get(index=1)
        distanceToDetect = 0
        if(speed == 100):
            distanceToDetect = 80
        if(speed == 67):
            distanceToDetect = 50
        if (speed == 33):
            distanceToDetect = 40
        cyberpi.console.println(distanceToDetect)
        if(distance <= distanceToDetect and boolDriving):
            cyberpi.mbot2.EM_stop(port="all")
            cyberpi.mbot2.drive_power(100, 100)
            time.sleep(0.27)
            cyberpi.mbot2.EM_stop(port="all")

def sendServer():
    while True:
        if lineFollowerRunning:
            time.sleep(1)
            continue  # Skip sending other sensor data if line follower is running
        startUpTimer = "StartUpTimer:{0};".format(str(startUpCounter.get()))
        distance = "Distance:{0};".format(str(cyberpi.ultrasonic2.get(index=1)))
        volume = "Volume:{0};".format(str(cyberpi.get_loudness()))
        lightness = "Lightness:{0};".format(str(lightValue.get()))
        data = startUpTimer + distance + volume + lightness
        udp_socket.sendto(data.encode(), (addr[0], port))
        time.sleep(1)

def receiveServer():
    global lineFollowerRunning, receive_thread_running
    while receive_thread_running:
        if lineFollowerRunning:
            time.sleep(1)
            continue  # Skip receiving other data if line follower is running
        global speed
        global boolDriving
        data, addr = udp_socket.recvfrom(1024)
        commandTyp, _, command = data.decode().partition(';')
        if commandTyp == "0":
            moveForwardW()
        elif commandTyp == "1":
            cyberpi.mbot2.drive_power(speed, speed)
            boolDriving = False
        elif commandTyp == "2":
            boolDriving = False
            moveBackwards()
        elif commandTyp == "3":
            boolDriving = False
            cyberpi.mbot2.drive_power(-speed, -speed)
        elif commandTyp == "-1":
            boolDriving = False
            cyberpi.mbot2.EM_stop(port="all")
        elif commandTyp == "5":
            speed = 33
        elif commandTyp == "6":
            speed = 67
        elif commandTyp == "7":
            speed = 100
        elif commandTyp == "8":
            rgb_components = command.split(':')
            r = int(rgb_components[0])
            g = int(rgb_components[1])
            b = int(rgb_components[2])
            cyberpi.led.on(r, g, b)
        elif commandTyp == "9":
            global boolPrevention
            cyberpi.console.println(boolPrevention)
            boolPrevention = command
            cyberpi.console.println('Prevention changed')
            cyberpi.console.println(boolPrevention)
            if(boolPrevention):
                _thread.start_new_thread(preventionMode, ())
            else:
                boolPrevention = False
        elif commandTyp == "10":
            cyberpi.audio.play('yeah')
        elif commandTyp == "11":
            cyberpi.console.println('11')
            if not lineFollowerRunning:
                _thread.start_new_thread(lineFollower, ())

_thread.start_new_thread(sendServer, ())
_thread.start_new_thread(receiveServer, ())
