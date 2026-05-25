import { useRoleBase } from '../../utils/roleBase';
import SubNav from '../dashboard/SubNav';

const AI_ITEMS = (base) => [
  { label: 'AI Settings', path: `${base}/ai/settings` },
  { label: 'Usage Logs', path: `${base}/ai/logs` },
  { label: 'Syllabus Upload', path: `${base}/ai/syllabus` },
  { label: 'Question Bank', path: `${base}/ai/question-bank` },
  { label: 'Exam Generator', path: `${base}/ai/exam-generator` },
  { label: 'Marking Scheme', path: `${base}/ai/marking-scheme` },
];

export default function AiNav() {
  const base = useRoleBase();
  return <SubNav items={AI_ITEMS(base)} />;
}
