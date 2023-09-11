import { Restrict, Store } from "./store";
import { UserStore } from "./userStore";

const credentialStore = new Store();
credentialStore.writeEntries({ username: "user1" });

export class AdminStore extends Store {
  @Restrict("rw")
  public user: UserStore;
  @Restrict("none")
  name: string = "John Doe";
  @Restrict("rw")
  getCredentials = (): Store => {
    return credentialStore;
  };

  constructor(user: UserStore) {
    super();
    this.defaultPolicy = "none";
    this.user = user;
  }
}
