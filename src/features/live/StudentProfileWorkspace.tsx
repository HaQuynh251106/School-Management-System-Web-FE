import { GraduationCap, Settings } from 'lucide-react';
import { FunctionTabs } from '../../components/ui';
import { ProfileSettingsLive } from './ProfileSettingsLive';
import { StudentProfileLive } from './StudentLive';

export function StudentProfileWorkspace() {
  return <div className="student-profile-workspace">
    <header className="workspace-section-heading">
      <div><small>HỒ SƠ HỌC SINH</small><h2>Thông tin cá nhân & cài đặt</h2><p>Một nơi duy nhất để xem hồ sơ học tập, thông tin liên hệ và cấu hình nhận thông báo.</p></div>
    </header>
    <FunctionTabs tabs={[
      { id: 'information', label: 'Thông tin hồ sơ', Icon: GraduationCap, content: <StudentProfileLive /> },
      { id: 'settings', label: 'Cài đặt tài khoản', Icon: Settings, content: <ProfileSettingsLive actor="student" /> },
    ]} />
  </div>;
}
