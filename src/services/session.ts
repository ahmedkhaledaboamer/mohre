/** Tracks the acting demo user so mock services can stamp audit entries. */
let actorId = 'u-owner';

export const setActor = (id: string) => {
  actorId = id;
};

export const getActor = () => actorId;