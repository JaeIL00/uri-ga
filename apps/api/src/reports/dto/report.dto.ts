export interface AiReportDto {
  reportPeriod: string;
  summary: string;
  analysisJson: Record<string, unknown>;
  feedback: string;
  createdAt: string;
}
