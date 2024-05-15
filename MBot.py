import cyberpi
import time
import socket
import ujson
import usocket
import machine
import ussl as ssl
import mbot2
import event
import os
import _thread



#import RPi.GPIO as GPIO



speed = 100
boolPrevention = False
boolDriving = False

cyberpi.console.println("Value: ")
"""
while True:
    cyberpi.audio.play('yeah')
    time.sleep(1)
    cyberpi.audio.play('hi')
    time.sleep(1)
    cyberpi.audio.play('laugh')
    time.sleep(1)
"""



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

shake = cyberpi.get_shakeval

startUpCounter = cyberpi.timer








#time.sleep(100)

def moveForwardDivs():
    cyberpi.mbot2.EM_stop(port = "all")
    
    if speed > 90:
        cyberpi.mbot2.drive_power(50,-50)
        time.sleep(0.5)
        
    cyberpi.mbot2.drive_power(speed,-speed)
    
    
def moveBackwards():
    cyberpi.mbot2.EM_stop(port = "all")
    cyberpi.mbot2.drive_power(-speed,speed)

def moveForwardW():
    cyberpi.mbot2.drive_power(speed,-speed)
    global boolDriving
    boolDriving = True
    
    



        
    




#1
"""
time.sleep(5)
cyberpi.mbot2.drive_power(100,100)
time.sleep(0.5)
cyberpi.mbot2.EM_stop(port = "all")
"""

#1/2
"""
time.sleep(5)
cyberpi.mbot2.drive_power(100,100)
time.sleep(0.27)
cyberpi.mbot2.EM_stop(port = "all")
"""

"""
time.sleep(5)
cyberpi.mbot2.drive_power(100,100)
time.sleep(0.1)
cyberpi.mbot2.EM_stop(port = "all")
"""

    


    



    
# Blue
cyberpi.led.on(0, 0, 255)


# Check if connected to the Wi-Fi network
while True:

    # Connect to Wi-Fi
    cyberpi.network.config_sta("htljoh-public", "joh12345")
    
    if not cyberpi.network.is_connect():
        cyberpi.led.on(255, 0, 0)  # Red
        time.sleep(1)
    else:
        cyberpi.led.on(0, 255, 0)  # Green
        sockaddr = cyberpi.network.get_ip()
        cyberpi.console.println("IP:")
        cyberpi.console.println(sockaddr)
        
        
        """cyberpi.display.clear()"""
        break
    
"""
cyberpi.console.println("Connection established")
"""

subnet = cyberpi.network.get_subnet_mark()
gateway = cyberpi.network.get_gateway()
sockaddr = cyberpi.network.get_ip()


port=12345



# UDP-Socket erstellen
udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp_socket.bind(('', port))  # Binden an alle verfügbaren Schnittstellen

cyberpi.console.println('Listening (UDP)')


# Find-Mbot
while True:
    data, addr = udp_socket.recvfrom(1024)  # Nachricht empfangen
    
    cyberpi.console.println('Nachricht erhalten: {} : {}' .format(addr, data))
    
    # Hier kannst du auf die Nachricht reagieren und eine Antwort senden
    if data.decode() == "MBotDiscovery":
        response_message = "MBotDiscovered"
        # addr[0] = Server IP
        udp_socket.sendto(response_message.encode(), (addr[0],port))  # Antwort senden  
        cyberpi.console.println('Serverip: {} ' .format(addr[0]))
    elif data.decode() == "Connected to Server":
        cyberpi.console.println('Connected to server!')
        break
    
    



def preventionMode():
    
    global boolPrevention
    global speed
    global boolDriving
    
    cyberpi.console.println(boolPrevention)
    
    while(boolPrevention):
        
        cyberpi.console.println(speed)
        
        #cyberpi.console.println(boolPrevention)
        
        distance = cyberpi.ultrasonic2.get(index=1)
        
        distanceToDetect = 0
        
        if(speed == 100):
            distanceToDetect = 80
            
        if(speed == 67):
            distanceToDetect = 50
        
        if (speed == 33):
            distanceToDetect = 40
        
        
        cyberpi.console.println(distanceToDetect)
        
        #cyberpi.console.println("Distance: "+distance)
        #cyberpi.console.println("DistanceToDetect: "+distanceToDetect)
        
        if(distance <= distanceToDetect and boolDriving):
            cyberpi.mbot2.EM_stop(port = "all")
            cyberpi.mbot2.drive_power(100,100)
            time.sleep(0.27)
            cyberpi.mbot2.EM_stop(port = "all")
            

# ultrasonic2, loudness, abs



def sendServer():
    while True:
        #cyberpi.console.println('In:sendServer()')
        startUpTimer = "StartUpTimer:" + str(startUpCounter.get()) + ";"
        distance = "Distance:" + str(cyberpi.ultrasonic2.get(index=1)) + ";"
        volume = "Volume:" + str(cyberpi.get_loudness())  + ";"
        #volume = "Volume: " + "Testvolume"
        
        lightness = "Lightness:" + str(lightValue.get()) + ";"
        
        data = startUpTimer + distance + volume + lightness
        udp_socket.sendto(data.encode(), (addr[0],port))  #senden
        time.sleep(1)
        




def receiveServer():
    while True:
        
        global speed
        global boolDriving
        
        #global boolRec
        
        data, addr = udp_socket.recvfrom(1024)  # Nachricht empfangen
        commandTyp, *_, command = data.decode().partition(';')
            
            # cyberpi.console.println(commandTyp)
            #cyberpi.console.println('Nachricht erhalten: {} : {}' .format(addr, data))
            
            #Receive:
            # move
            # 0: forward; 1: right; 2: backwards; 3:left; -1: stop
        
        if commandTyp == "0":
            #response_message = "MoveForward"
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
            moveForwardW()
                
        elif commandTyp == "1":
            #response_message = "MoveRight"
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
            
            cyberpi.mbot2.drive_power(speed, speed)
            boolDriving = False
                #time.sleep(0.27)
                #cyberpi.mbot2.EM_stop(port = "all")
                
                
        elif commandTyp == "2":
            #response_message = "MoveBackwards"
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
            boolDriving = False
            moveBackwards()
            
        
        elif commandTyp == "3":
            #response_message = "MoveLeft"
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
            boolDriving = False
            cyberpi.mbot2.drive_power(-speed, -speed)
            #time.sleep(0.27)
            #cyberpi.mbot2.EM_stop(port = "all")
                
                
                
        elif commandTyp == "-1":
            #response_message = "Stop"
            boolDriving = False
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
                
            cyberpi.mbot2.EM_stop(port = "all")
                
        
        
            # speed
            # 5: slow; 6: medium; 7: fast
            
        elif commandTyp == "5":
            #response_message = "slow"
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
            #cyberpi.console.println('slow')
            speed = 33
        
        elif commandTyp == "6":
            #response_message = "medium"
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
            #cyberpi.console.println('medium')
            speed = 67
                
        elif commandTyp == "7":
            #response_message = "fast"
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
            #cyberpi.console.println('fast')
            speed = 100
                
            # color: 8
        elif commandTyp == "8":
            #response_message = "colorChanged"
            #udp_socket.sendto('Response:' + response_message.encode(), (addr[0],port))  # Antwort senden  
            #cyberpi.console.println('colorChanged')
                
            rgb_components = command.split(':')
                
            r = int(rgb_components[0])
            g = int(rgb_components[1])
            b = int(rgb_components[2])
                
            cyberpi.led.on(r,g,b)
            
        elif commandTyp == "9":
            
            global boolPrevention
            
            cyberpi.console.println(boolPrevention)
            
            boolPrevention = command
            
            cyberpi.console.println('Prevention changed')
            
            cyberpi.console.println(boolPrevention)
                        
            if(boolPrevention):
                _thread.start_new_thread(preventionMode,())
            else:
                boolPrevention = False
                
        elif commandTyp == "10":
            cyberpi.audio.play('yeah')
            

            # direction: oben rechts
            
        #elif commandTyp == "9":
            #cyberpi.mbot2.drive_power(speed,-speed/2)
            


#receiveServer()
#sendServer()


# Start both Sending and Receiving Threads
_thread.start_new_thread(sendServer,())
_thread.start_new_thread(receiveServer,())


    




    
"""
cyberpi.mbot2.drive_power(100,0)
time.sleep(2)
cpi.mbot2.EM_stop(port = "all")

"""
