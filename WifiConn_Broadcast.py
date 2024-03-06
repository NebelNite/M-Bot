import cyberpi
import time
import socket
import ujson
import usocket
import machine
import ussl as ssl

# Blue
cyberpi.led.on(0, 0, 255)

# Connect to Wi-Fi
cyberpi.network.config_sta("htljoh-public", "joh12345")


# Check if connected to the Wi-Fi network
while True:
    if not cyberpi.network.is_connect():
        cyberpi.led.on(255, 0, 0)  # Red
        time.sleep(1)
    else:
        cyberpi.led.on(0, 255, 0)  # Green
        sockaddr = cyberpi.network.get_ip()
        cyberpi.console.println("IP:")
        cyberpi.console.println(sockaddr)
        cyberpi.display.clear()
        break


cyberpi.console.println("Connection established")

subnet = cyberpi.network.get_subnet_mark()
gateway = cyberpi.network.get_gateway()
sockaddr = cyberpi.network.get_ip()





# Broadcast
udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

udp.bind(('', 1234))
udp.setblocking(False)

while True:
    try:
        data, addr = udp.recvfrom(1024)
        if data == b'MBot2 Discovery':
            print('Broadcast request received and answered')
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s = ssl.wrap_socket(s, server_side=False, cert_reqs=ssl.CERT_NONE)
            s.connect((addr, 3500))

            s.send(b'D3')
            time.sleep(1)
            data = s.recv(1024)
            s.close()
            break
    except OSError:
        pass

    print("Waiting for broadcast request...")
    time.sleep(0.1)

udp.close()
#
