import type { AttendanceRecord, Grade } from '../../api/types';
import { InfoGrid, StatusPill } from '../../components/ui';
import { ATT_LABEL, fmtDate } from './common';

function scoreLabel(value?: number | null) {
  return value == null || Number.isNaN(value) ? '—' : value.toFixed(1);
}

function percentLabel(value: number) {
  return `${Math.round(value)}%`;
}

function buildSubjectAverages(grades: Grade[]) {
  const groups = new Map<string, { name: string; total: number; count: number }>();
  grades
    .filter((g) => Number.isFinite(g.score))
    .forEach((g) => {
      const key = g.subjectId || g.subjectName;
      const current = groups.get(key) || { name: g.subjectName || key, total: 0, count: 0 };
      current.total += g.score;
      current.count += 1;
      groups.set(key, current);
    });

  return Array.from(groups.entries())
    .map(([subjectId, g]) => ({
      subjectId,
      subjectName: g.name,
      average: g.count ? g.total / g.count : 0,
      count: g.count,
    }))
    .sort((a, b) => b.average - a.average);
}

export function GradeOverview({ grades }: { grades: Grade[] }) {
  const valid = grades.filter((g) => Number.isFinite(g.score));
  const subjectAverages = buildSubjectAverages(valid);
  const average = valid.length ? valid.reduce((sum, g) => sum + g.score, 0) / valid.length : null;
  const best = subjectAverages[0];
  const watch = subjectAverages.length > 1 ? subjectAverages[subjectAverages.length - 1] : null;

  return (
    <div className="live-overview">
      <InfoGrid items={[
        { title: 'Điểm TB hiện có', value: scoreLabel(average), meta: `${valid.length} cột điểm thật` },
        { title: 'Số môn có điểm', value: String(subjectAverages.length), meta: 'Nhóm theo subjectId' },
        { title: 'Môn nổi bật', value: best ? `${best.subjectName} ${scoreLabel(best.average)}` : '—', meta: best ? `${best.count} cột điểm` : 'Chưa có dữ liệu' },
        { title: 'Cần theo dõi', value: watch ? `${watch.subjectName} ${scoreLabel(watch.average)}` : '—', meta: watch ? `${watch.count} cột điểm` : 'Chưa đủ môn để so sánh' },
      ]} />

      {subjectAverages.length > 0 && (
        <div className="live-meter-list" aria-label="Điểm trung bình theo môn">
          {subjectAverages.map((item) => (
            <div className="live-meter-row" key={item.subjectId}>
              <span>{item.subjectName}</span>
              <div className="live-meter-track">
                <i style={{ width: `${Math.max(0, Math.min(100, item.average * 10))}%` }} />
              </div>
              <strong>{scoreLabel(item.average)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function summarizeAttendance(records: AttendanceRecord[]) {
  const total = records.length;
  const present = records.filter((r) => r.status === 'PRESENT').length;
  const late = records.filter((r) => r.status === 'LATE').length;
  const absentExcused = records.filter((r) => r.status === 'ABSENT_EXCUSED').length;
  const absentUnexcused = records.filter((r) => r.status === 'ABSENT_UNEXCUSED').length;
  const attended = present + late;
  const attendanceRate = total ? (attended / total) * 100 : 0;
  return { total, present, late, absentExcused, absentUnexcused, attended, attendanceRate };
}

export function AttendanceOverview({ records }: { records: AttendanceRecord[] }) {
  const stats = summarizeAttendance(records);
  const alerts = records
    .filter((r) => r.status !== 'PRESENT')
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="live-overview">
      <InfoGrid items={[
        { title: 'Tỷ lệ có mặt', value: percentLabel(stats.attendanceRate), meta: `${stats.attended}/${stats.total} buổi có mặt hoặc đi trễ` },
        { title: 'Vắng có phép', value: String(stats.absentExcused), meta: 'ABSENT_EXCUSED' },
        { title: 'Vắng không phép', value: String(stats.absentUnexcused), meta: 'ABSENT_UNEXCUSED' },
        { title: 'Đi trễ', value: String(stats.late), meta: 'LATE' },
      ]} />

      {alerts.length > 0 && (
        <div className="live-alert-list" aria-label="Cảnh báo chuyên cần gần đây">
          {alerts.map((r) => (
            <div className="live-alert-row" key={r.id}>
              <div>
                <strong>{fmtDate(r.date)} · {r.subjectName || 'Môn học'}</strong>
                <small>Tiết {r.periodNo ?? '—'} · {r.note || 'Chưa có ghi chú'}</small>
              </div>
              <StatusPill value={ATT_LABEL[r.status] || r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
