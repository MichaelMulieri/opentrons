"""Tests for /modules routes."""
import pytest
from decoy import Decoy
from typing_extensions import Final

from opentrons.hardware_control import HardwareControlAPI
from opentrons.drivers.rpi_drivers.types import USBPort as HardwareUSBPort
from opentrons.hardware_control.modules import MagDeck, ModuleType, MagneticStatus

from opentrons.protocol_engine import ModuleModel

from robot_server.modules.router import get_attached_modules
from robot_server.modules.module_identifier import ModuleIdentifier, ModuleIdentity
from robot_server.modules.module_data_mapper import ModuleDataMapper
from robot_server.modules.module_models import (
    MagneticModule,
    MagneticModuleData,
    UsbPort,
)


_HTTP_API_VERSION: Final = 3


@pytest.fixture()
def hardware_api(decoy: Decoy) -> HardwareControlAPI:
    """Get a mock hardware control API."""
    return decoy.mock(cls=HardwareControlAPI)


@pytest.fixture()
def magnetic_module(decoy: Decoy) -> MagDeck:
    """Get a mock magnetic module control interface."""
    return decoy.mock(cls=MagDeck)


@pytest.fixture()
def module_identifier(decoy: Decoy) -> ModuleIdentifier:
    """Get a mock module data mapper."""
    return decoy.mock(cls=ModuleIdentifier)


@pytest.fixture()
def module_data_mapper(decoy: Decoy) -> ModuleDataMapper:
    """Get a mock module data mapper."""
    return decoy.mock(cls=ModuleDataMapper)


async def test_get_modules_empty(
    decoy: Decoy,
    hardware_api: HardwareControlAPI,
) -> None:
    """It should get an empty modules list from the hardware API."""
    decoy.when(hardware_api.attached_modules).then_return([])

    result = await get_attached_modules(
        requested_version=_HTTP_API_VERSION,
        hardware=hardware_api,
    )

    assert result.content.data == []
    assert result.status_code == 200


async def test_get_modules_maps_data_and_id(
    decoy: Decoy,
    hardware_api: HardwareControlAPI,
    magnetic_module: MagDeck,
    module_data_mapper: ModuleDataMapper,
    module_identifier: ModuleIdentifier,
) -> None:
    """It should map the module control data to response."""
    expected_response = MagneticModule(
        id="module-id",
        serialNumber="serial-number",
        firmwareVersion="1.2.3",
        hardwareRevision="hardware-revision",
        hasAvailableUpdate=True,
        moduleType=ModuleType.MAGNETIC,
        moduleModel=ModuleModel.MAGNETIC_MODULE_V1,
        usbPort=UsbPort(port=42, hub=None, path="/dev/null"),
        data=MagneticModuleData(
            status=MagneticStatus.ENGAGED,
            engaged=True,
            height=101,
        ),
    )

    decoy.when(hardware_api.attached_modules).then_return([magnetic_module])
    decoy.when(magnetic_module.has_available_update()).then_return(True)
    decoy.when(magnetic_module.model()).then_return("magneticModuleV1")
    decoy.when(magnetic_module.device_info).then_return(
        {
            "serial": "abc",
            "version": "1.2.3",
        }
    )
    decoy.when(magnetic_module.live_data).then_return(
        {
            "status": "engaged",
            "data": {"engaged": True, "height": 42},
        }
    )
    decoy.when(magnetic_module.usb_port).then_return(
        HardwareUSBPort(name="abc", port_number=101)
    )

    module_identity = ModuleIdentity(
        module_id="module-id",
        serial_number="serial-number",
        firmware_version="firmware-version",
        hardware_revision="hardware-revision",
    )

    decoy.when(
        module_identifier.identify({"serial": "abc", "version": "1.2.3"})
    ).then_return(module_identity)

    decoy.when(
        module_data_mapper.map_data(
            model="magneticModuleV1",
            module_identity=module_identity,
            has_available_update=True,
            live_data={"status": "engaged", "data": {"engaged": True, "height": 42}},
            usb_port=HardwareUSBPort(name="abc", port_number=101),
        )
    ).then_return(expected_response)

    result = await get_attached_modules(
        requested_version=_HTTP_API_VERSION,
        hardware=hardware_api,
        module_data_mapper=module_data_mapper,
        module_identifier=module_identifier,
    )

    assert result.content.data == [expected_response]
