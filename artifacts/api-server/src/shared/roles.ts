// Roles mapping for Arabic display
export const ROLE_LABELS: Record<string, string> = {
  "Graduate-Affairs": "شؤون الخريجين",
  "College-Registrar": "مسجل الكلية",
  "Dean": "عميد الكلية",
  "General-Registrar": "المسجل العام",
  "University-President": "رئيس الجامعة",
  "Contract-Creator": "منشئ العقد",
  "Purchase-Requester": "مقدم طلب الشراء",
  "Secretary-General": "الأمين العام",
  "Financial-Manager": "المدير المالي",
  "Purchasing": "المشتريات",
  "Reviewer-Accounts": "المراجع/الحسابات",
  "External-Representative": "ممثل جهة خارجية",
  "New-Employee": "موظف جديد",
  "Board-Chairman": "رئيس مجلس الأمناء",
  "Recruitment-Officer": "مسؤول التوظيف",
};

export const ROLE_PERMISSIONS: Record<string, { canSign: boolean; canReturn: boolean; canReject: boolean }> = {
  "Graduate-Affairs": { canSign: true, canReturn: false, canReject: true },
  "College-Registrar": { canSign: true, canReturn: true, canReject: true },
  "Dean": { canSign: true, canReturn: true, canReject: true },
  "General-Registrar": { canSign: true, canReturn: true, canReject: true },
  "University-President": { canSign: true, canReturn: true, canReject: true },
  "Contract-Creator": { canSign: true, canReturn: false, canReject: true },
  "Purchase-Requester": { canSign: true, canReturn: false, canReject: true },
  "Secretary-General": { canSign: true, canReturn: true, canReject: true },
  "Financial-Manager": { canSign: true, canReturn: true, canReject: true },
  "Purchasing": { canSign: true, canReturn: true, canReject: true },
  "Reviewer-Accounts": { canSign: true, canReturn: true, canReject: true },
  "External-Representative": { canSign: true, canReturn: false, canReject: false },
  "New-Employee": { canSign: true, canReturn: false, canReject: false },
  "Board-Chairman": { canSign: true, canReturn: true, canReject: true },
  "Recruitment-Officer": { canSign: true, canReturn: true, canReject: true },
};

// Default workflows for document types (Arabic steps as requested)
export const DEFAULT_WORKFLOWS: Record<string, Array<{ role: string; name: string; isExternal?: boolean }>> = {
  certificate: [
    { role: "Graduate-Affairs", name: "شؤون الخريجين" },
    { role: "College-Registrar", name: "مسجل الكلية" },
    { role: "Dean", name: "عميد الكلية" },
    { role: "General-Registrar", name: "المسجل العام" },
    { role: "University-President", name: "رئيس الجامعة" },
  ],
  invoice: [
    { role: "Purchase-Requester", name: "مقدم طلب الشراء" },
    { role: "Secretary-General", name: "الأمين العام" },
    { role: "Financial-Manager", name: "المدير المالي" },
    { role: "Purchasing", name: "المشتريات" },
    { role: "Reviewer-Accounts", name: "المراجع/الحسابات" },
  ],
};

export const CONTRACT_WORKFLOWS: Record<string, Array<{ role: string; name: string; isExternal?: boolean }>> = {
  employment: [
    { role: "Recruitment-Officer", name: "مسؤول التوظيف" },
    { role: "External-Representative", name: "الموظف الجديد", isExternal: true },
    { role: "Board-Chairman", name: "رئيس مجلس الأمناء" },
  ],
  purchase: [
    { role: "Secretary-General", name: "الأمين العام" },
    { role: "External-Representative", name: "المورد", isExternal: true },
    { role: "Board-Chairman", name: "رئيس مجلس الأمناء" },
  ],
  partnership: [
    { role: "University-President", name: "رئيس الجامعة" },
    { role: "External-Representative", name: "المؤسسة الشريكة", isExternal: true },
    { role: "Board-Chairman", name: "رئيس مجلس الأمناء" },
  ],
};
