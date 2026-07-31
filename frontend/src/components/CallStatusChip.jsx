import { Chip } from '@mui/material';

const STATUS_COLORS = {
  'Need to Call': 'default',
  'Not Answered': 'warning',
  'Answered': 'success',
};

const CallStatusChip = ({ status }) => {
  const s = status || 'Need to Call';
  return <Chip label={s} size="small" color={STATUS_COLORS[s] || 'default'} />;
};

export default CallStatusChip;
