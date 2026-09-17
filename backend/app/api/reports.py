from fastapi import APIRouter, Depends, Response
from typing import Dict, Any
from app.schemas.report_schemas import ConsultationReportRequest
from app.core.auth import get_current_user
from app.core.report_generator import build_consultation_report

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/consultation-summary")
async def download_consultation_report(
    req: ConsultationReportRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Generates a printable .docx consultation summary for the currently
    authenticated patient. Patient identity (name/phone/village) is taken
    from the verified JWT session, never from the request body, so a
    patient can only ever generate a report for themselves.
    """
    docx_bytes = build_consultation_report(
        patient_name=user.get("name", "Patient"),
        patient_phone=user.get("phone", ""),
        patient_village=user.get("village", ""),
        conversation_id=req.conversation_id,
        tier=req.tier,
        flags=req.flags,
        remedies=[r.model_dump() for r in req.remedies],
        consultation_summary=req.consultation_summary,
    )

    filename = f"Sanjeevani_Consultation_{req.conversation_id}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )