

type Book = {
    id: string;
    name: string;
    time: number;
}


const book1: Omit<Book, "id" | "time"> = {
    name: "book1",
}