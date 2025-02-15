"""Test Thermocycler wait for lid temperature command implementation."""
from decoy import Decoy

from opentrons.hardware_control.modules import Thermocycler

from opentrons.protocol_engine.state import StateView
from opentrons.protocol_engine.state.module_substates import (
    ThermocyclerModuleSubState,
    ThermocyclerModuleId,
)
from opentrons.protocol_engine.execution import EquipmentHandler
from opentrons.protocol_engine.commands import thermocycler as tc_commands
from opentrons.protocol_engine.commands.thermocycler.wait_for_lid_temperature import (
    WaitForLidTemperatureImpl,
)


async def test_set_target_block_temperature(
    decoy: Decoy,
    state_view: StateView,
    equipment: EquipmentHandler,
) -> None:
    """It should be able to wait for the specified module's target temperature."""
    subject = WaitForLidTemperatureImpl(state_view=state_view, equipment=equipment)

    data = tc_commands.WaitForLidTemperatureParams(
        moduleId="input-thermocycler-id",
    )
    expected_result = tc_commands.WaitForLidTemperatureResult()

    tc_module_substate = decoy.mock(cls=ThermocyclerModuleSubState)
    tc_hardware = decoy.mock(cls=Thermocycler)

    decoy.when(
        state_view.modules.get_thermocycler_module_substate("input-thermocycler-id")
    ).then_return(tc_module_substate)

    decoy.when(tc_module_substate.get_target_lid_temperature()).then_return(76.6)
    decoy.when(tc_module_substate.module_id).then_return(
        ThermocyclerModuleId("thermocycler-id")
    )

    # Get attached hardware modules
    decoy.when(
        equipment.get_module_hardware_api(ThermocyclerModuleId("thermocycler-id"))
    ).then_return(tc_hardware)

    result = await subject.execute(data)

    decoy.verify(await tc_hardware.wait_for_lid_temperature(temperature=76.6), times=1)
    assert result == expected_result
