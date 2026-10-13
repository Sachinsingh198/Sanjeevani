from fastapi import APIRouter, Depends, Response
from typing import Dict, Any, Optional
from app.schemas.report_schemas import ConsultationReportRequest
from app.core.auth import get_optional_current_user
from app.core.report_generator import build_consultation_report, build_consultation_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/consultation-summary")
async def download_consultation_report(
    req: ConsultationReportRequest,
    format: str = "docx",
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Generates a printable .docx or .pdf consultation summary. If authenticated,
    patient identity (name/phone/village) is taken from the verified JWT session.
    If anonymous or guest, gracefully defaults to respectful standard values.
    """
    user_dict = user or {}
    p_name = user_dict.get("name", "Patient")
    p_phone = user_dict.get("phone", "")
    p_village = user_dict.get("village", "")
    remedy_dicts = [r.model_dump() for r in req.remedies]

    if format.lower() == "pdf":
        pdf_bytes = build_consultation_pdf_report(
            patient_name=p_name,
            patient_phone=p_phone,
            patient_village=p_village,
            conversation_id=req.conversation_id,
            tier=req.tier,
            flags=req.flags,
            remedies=remedy_dicts,
            consultation_summary=req.consultation_summary,
        )
        filename = f"Sanjeevani_Consultation_{req.conversation_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    docx_bytes = build_consultation_report(
        patient_name=p_name,
        patient_phone=p_phone,
        patient_village=p_village,
        conversation_id=req.conversation_id,
        tier=req.tier,
        flags=req.flags,
        remedies=remedy_dicts,
        consultation_summary=req.consultation_summary,
    )

    filename = f"Sanjeevani_Consultation_{req.conversation_id}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/consultation-summary.pdf")
async def download_consultation_pdf_endpoint(
    req: ConsultationReportRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """Direct alias for PDF report generation."""
    return await download_consultation_report(req=req, format="pdf", user=user)