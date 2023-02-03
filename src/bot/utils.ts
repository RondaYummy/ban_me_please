export function getFullUserName(user) {
  let name = user.first_name;
  if (user.last_name) {
    name += `${user.last_name}`;
  }
  return name;
}

export function makeRawUserIdLink(title: string, id: number) {
  return `[${title}](tg://user?id=${id})`;
}
