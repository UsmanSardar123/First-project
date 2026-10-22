const RECURRENCES = ['one-time', 'weekly', 'monthly', 'yearly'];

function advanceDueDate(dueDate, recurrence, anchorDay, anchorMonth) {
  const next = new Date(dueDate);
  if (Number.isNaN(next.getTime())) throw new Error('Invalid due date');

  if (recurrence === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  if (recurrence === 'monthly') {
    const year = next.getUTCFullYear();
    const month = next.getUTCMonth() + 1;
    const targetYear = year + Math.floor(month / 12);
    const targetMonth = month % 12;
    const day = Math.min(anchorDay, new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate());
    return new Date(Date.UTC(targetYear, targetMonth, day));
  }
  if (recurrence === 'yearly') {
    const year = next.getUTCFullYear() + 1;
    const day = Math.min(anchorDay, new Date(Date.UTC(year, anchorMonth, 0)).getUTCDate());
    return new Date(Date.UTC(year, anchorMonth - 1, day));
  }

  throw new Error('A one-time bill has no next due date');
}

module.exports = { RECURRENCES, advanceDueDate };
