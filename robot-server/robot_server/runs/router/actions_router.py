"""Router for /runs actions endpoints."""
import logging

from fastapi import APIRouter, Depends, status
from datetime import datetime
from typing import Union
from typing_extensions import Literal

from robot_server.errors import ErrorDetails, ErrorBody
from robot_server.service.dependencies import get_current_time, get_unique_id
from robot_server.service.json_api import RequestModel, SimpleBody, PydanticResponse
from robot_server.service.task_runner import TaskRunner, get_task_runner

from ..engine_store import EngineStore
from ..run_store import RunStore, RunNotFoundError
from ..run_controller import RunController, RunActionNotAllowedError
from ..action_models import RunAction, RunActionCreate
from ..dependencies import get_engine_store, get_run_store
from .base_router import RunNotFound, RunStopped

log = logging.getLogger(__name__)
actions_router = APIRouter()


class RunActionNotAllowed(ErrorDetails):
    """An error if one tries to issue an unsupported run action."""

    id: Literal["RunActionNotAllowed"] = "RunActionNotAllowed"
    title: str = "Run Action Not Allowed"


async def get_run_controller(
    runId: str,
    task_runner: TaskRunner = Depends(get_task_runner),
    engine_store: EngineStore = Depends(get_engine_store),
    run_store: RunStore = Depends(get_run_store),
) -> RunController:
    """Get a RunController for the current run.

    This ensures that a run exists and is current at the time the request is
    received. Dependents should not assume that condition will necessarily
    hold throughout the lifetime of the request handler.
    """
    if not run_store.has(runId):
        raise RunNotFound(detail=f"Run {runId} not found.").as_error(
            status.HTTP_404_NOT_FOUND
        )

    if runId != engine_store.current_run_id:
        raise RunStopped(detail=f"Run {runId} is not the current run").as_error(
            status.HTTP_409_CONFLICT
        )

    return RunController(
        run_id=runId,
        task_runner=task_runner,
        engine_store=engine_store,
        run_store=run_store,
    )


@actions_router.post(
    path="/runs/{runId}/actions",
    summary="Issue a control action to the run",
    description="Provide an action in order to control execution of the run.",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {"model": SimpleBody[RunAction]},
        status.HTTP_409_CONFLICT: {
            "model": ErrorBody[Union[RunActionNotAllowed, RunStopped]],
        },
        status.HTTP_404_NOT_FOUND: {"model": ErrorBody[RunNotFound]},
    },
)
async def create_run_action(
    runId: str,
    request_body: RequestModel[RunActionCreate],
    run_controller: RunController = Depends(get_run_controller),
    action_id: str = Depends(get_unique_id),
    created_at: datetime = Depends(get_current_time),
) -> PydanticResponse[SimpleBody[RunAction]]:
    """Create a run control action.

    Arguments:
        runId: Run ID pulled from the URL.
        request_body: Input payload from the request body.
        run_controller: Run controller bound to the given run ID.
        action_id: Generated ID to assign to the control action.
        created_at: Timestamp to attach to the control action.
    """
    try:
        action = run_controller.create_action(
            action_id=action_id,
            action_type=request_body.data.actionType,
            created_at=created_at,
        )

    except RunActionNotAllowedError as e:
        raise RunActionNotAllowed(detail=str(e)).as_error(
            status.HTTP_409_CONFLICT
        ) from e

    except RunNotFoundError as e:
        raise RunNotFound(detail=str(e)).as_error(status.HTTP_404_NOT_FOUND) from e

    return await PydanticResponse.create(
        content=SimpleBody.construct(data=action),
        status_code=status.HTTP_201_CREATED,
    )
