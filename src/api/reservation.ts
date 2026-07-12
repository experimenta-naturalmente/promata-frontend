import { api } from '@/core/api';

export async function cancelReservation(id: string) {
  return await api.post(`reservation/group/${id}/request/cancel`);
}

export async function deleteReservation(id: string) {
  return await api.delete(`reservation/group/${id}`);
}

export type RegisterMember = {
  name: string;
  phone: string;
  document: string;
  gender: string;
};

export async function addPeopleMyReservations(id: string, people: RegisterMember[]) {
  return await api.post(`reservation/group/${id}/members`, people);
}
