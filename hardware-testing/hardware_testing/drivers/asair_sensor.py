"""Asair sensor driver.

This libray is for the temperature and humidity sensor used with the
pipette gravimetric fixture. The sensor outputs temperature and
relative humidity that is recorded onto the pipette results.
"""
import abc
import codecs
import logging
import random
import time
from abc import ABC
from dataclasses import dataclass

import serial  # type: ignore[import]
from serial.serialutil import SerialException  # type: ignore[import]

log = logging.getLogger(__name__)


addrs = {
    "01": "C40B",
    "02": "C438",
    "03": "C5E9",
    "04": "C45E",
    "05": "C58F",
    "06": "C5BC",
    "07": "C46D",
    "08": "C492",
    "09": "C543",
    "10": "C74A",
}


class AsairSensorError(Exception):
    """Asair sensor error."""

    def __init__(self, ret_code: str = None) -> None:
        """Constructor."""
        super().__init__(ret_code)


@dataclass
class Reading:
    """An asair sensor reading."""

    temperature: float
    relative_humidity: float


class AsairSensorBase(ABC):
    """Abstract base class of sensor."""

    @abc.abstractmethod
    def get_reading(self) -> Reading:
        """Get a temp and humidity reading."""
        ...


class AsairSensor(AsairSensorBase):
    """Asair sensor driver."""

    def __init__(self, connection: serial.Serial, sensor_address: str = "01") -> None:
        """Constructor.

        :param connection: The serial connection
        :param sensor_address: The sensor address
        """
        self._sensor_address = sensor_address
        self._th_sensor = connection

    @classmethod
    def connect(
        cls,
        port: str,
        baudrate: int = 9600,
        timeout: float = 5,
        sensor_address: str = "01",
    ) -> "AsairSensor":
        """Create a driver.

        :param port: Port to connect to
        :param baudrate: The baud rate
        :param timeout: Timeout
        :param sensor_address: The sensor address
        :return: Connected driver.
        """
        try:
            connection = serial.Serial(
                port=port,
                baudrate=baudrate,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=timeout,
            )
            return cls(connection, sensor_address)
        except SerialException:
            error_msg = (
                "Unable to access Serial port to Scale: \n"
                "1. Check that the scale is plugged into the computer. \n"
                "2. Check if the assigned port is correct. \n"
            )
            raise SerialException(error_msg)

    def get_reading(self) -> Reading:
        """Get a reading."""
        data_packet = "{}0300000002{}".format(
            self._sensor_address, addrs[self._sensor_address]
        )
        log.debug(f"sending {data_packet}")
        command_bytes = codecs.decode(data_packet.encode(), "hex")
        try:
            self._th_sensor.flushInput()
            self._th_sensor.flushOutput()
            self._th_sensor.write(command_bytes)
            time.sleep(0.1)

            length = self._th_sensor.inWaiting()
            res = self._th_sensor.read(length)
            log.debug(f"received {res}")

            res = codecs.encode(res, "hex")
            temp = res[6:10]
            relative_hum = res[10:14]
            log.info(f"Temp: {temp}, RelativeHum: {relative_hum}")

            temp = float(int(temp, 16)) / 10
            relative_hum = float(int(relative_hum, 16)) / 10
            return Reading(temperature=temp, relative_humidity=relative_hum)

        except (IndexError, ValueError) as e:
            log.exception("Bad value read")
            raise AsairSensorError(str(e))
        except SerialException:
            log.exception("Communication error")
            error_msg = "Asair Sensor not connected. Check if port number is correct."
            raise AsairSensorError(error_msg)


class SimAsairSensor(AsairSensorBase):
    """Simulating Asair sensor driver."""

    def get_reading(self) -> Reading:
        """Get a reading."""
        temp = random.uniform(24.5, 25)
        relative_hum = random.uniform(45, 40)
        return Reading(temperature=temp, relative_humidity=relative_hum)
