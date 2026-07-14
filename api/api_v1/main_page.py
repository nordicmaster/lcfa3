from datetime import datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["MAIN"])


class DTItem(BaseModel):
    stage_name: str | None
    title: str | None
    company: str | None
    giptenders: str | None
    tendername: str | None
    date_tkp: datetime | None
    opup_comment: str | None
    date_start_work: datetime | None
    number_zakupki: str | None
    created_date: datetime | None
    sum_estimate_gip: float | None

    date_gip: datetime | None
    date_nfo: datetime | None
    date_que: datetime | None
    bp_status: str | None
    gip_comment: str | None
    et_1_str: str | None = None


class DTR(BaseModel):
    data: list[DTItem]


@router.post("")
async def make_deal_tender_report(body: DTR):
    return {"MAIN": 2}
