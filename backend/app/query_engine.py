import os
import uuid
import time
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer 
from loguru import logger

QDRANT_COLLECTION_NAME = "semantic_cache"
EMBEDDING_MODEL = "all-MiniLM-L6-v2" # Model 384-wymiarowy
EMBEDDING_DIMENSION = 384

class SemanticCache:
    
    def __init__(self):
        print(f"Inicjalizuję Semantic Cache z kolekcją: {QDRANT_COLLECTION_NAME}")
        
        # 1. Klient Qdrant (używamy bazy w pamięci dla prostoty)
        # Aby zapisać na dysku, użyj: location="./qdrant_db"
        self.qdrant = QdrantClient(location=":memory:")
        
        # 2. Model do tworzenia embeddingów (wektorów)
        self.encoder = SentenceTransformer(EMBEDDING_MODEL)


        # 4. Upewnij się, że kolekcja Qdrant istnieje
        self._setup_collection()

    def _setup_collection(self):
        """Tworzy kolekcję w Qdrant, jeśli jeszcze nie istnieje."""

        try:
            collections = self.qdrant.get_collection(collection_name=QDRANT_COLLECTION_NAME)
            exists = collections is not None
        except Exception as e:
            logger.debug(f"Nie można sprawdzić kolekcji: {e}")
            exists = False
        
        if not exists:
            try:
                self.qdrant.recreate_collection(
                    collection_name=QDRANT_COLLECTION_NAME,
                    vectors_config=models.VectorParams(
                        size=EMBEDDING_DIMENSION,
                        distance=models.Distance.COSINE # Cosine jest standardem dla SBERT
                    )
                )
                logger.info("Utworzono nową kolekcję Qdrant.")
            except Exception as e:
                logger.error(f"Nie można utworzyć kolekcji: {e}")

    def _get_embedding(self, text: str):
        """Generuje wektor dla danego tekstu."""
        return self.encoder.encode(text).tolist()

    def add_to_cache(self, question: str, answer: str):
        """Dodaje nową parę (pytanie, odpowiedź) do bazy Qdrant."""
        logger.info(f"\t[LOGIKA] -> Zapisuję w cache: '{question[:20]}...'")
        
        # Generujemy wektor dla pytania
        vector = self._get_embedding(question)
        
        # Tworzymy unikalne ID dla punktu
        point_id = str(uuid.uuid4())
        
        # W payloadzie przechowujemy oryginalne pytanie i odpowiedź
        payload = {
            "question_text": question,
            "answer_text": answer
        }
        
        # Wrzucamy punkt do Qdranta
        self.qdrant.upsert(
            collection_name=QDRANT_COLLECTION_NAME,
            points=[
                models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload
                )
            ]
        )

    def query(self, user_question: str, similarity_threshold: float = 0.7):
        """
        Główna metoda. Sprawdza cache.
        """
        logger.info(f"\n--- Zapytanie: '{user_question}' ---")
        
        # 1. Wygeneruj wektor dla pytania użytkownika
        query_vector = self._get_embedding(user_question)
        
        # 2. Przeszukaj Qdrant w poszukiwaniu NAJBARDZIEJ PODOBNEGO pytania
        search_results = self.qdrant.search(
            collection_name=QDRANT_COLLECTION_NAME,
            query_vector=query_vector,
            limit=1, # Chcemy tylko 1 najlepszy wynik
            with_payload=True # Potrzebujemy zapisaną odpowiedź
        )
        
        # 3. Zastosuj logikę progową
        if search_results and search_results[0].score >= similarity_threshold:
            # CACHE HIT!
            hit = search_results[0]
            score = hit.score
            stored_answer = hit.payload.get('answer_text')
            stored_question = hit.payload.get('question_text')

            logger.info(f"[CACHE HIT] Wynik: {score:.2f} (Próg: {similarity_threshold})")
            logger.info(f"        (Pasujące pytanie: '{stored_question}')")
            return stored_answer
        else:
            # CACHE MISS!
            if search_results:
                logger.info(f"[CACHE MISS] Najlepszy wynik {search_results[0].score:.2f} jest poniżej progu {similarity_threshold}.")
            else:
                logger.info("[CACHE MISS] Baza jest pusta lub nic nie znaleziono.")

            return None
        

if __name__ == "__main__":
    # Prosty test działania Semantic Cache
    cache = SemanticCache()
    
    # Dodajemy przykładowe dane do cache
    cache.add_to_cache("Jaka jest stolica Polski?", "Stolicą Polski jest Warszawa.")
    cache.add_to_cache("Kto napisał 'Lalkę'?", "Autorem 'Lalki' jest Bolesław Prus.")
    
    # Testujemy zapytania
    response = cache.query("Jakie miasto jest stolicą Polski?")
    print(f"Odpowiedź z cache: {response}")
    
    response = cache.query("Kto jest autorem powieści 'Lalka'?")
    print(f"Odpowiedź z cache: {response}")
    
    response = cache.query("Jaka jest najwyższa góra na świecie?")
    print(f"Odpowiedź z cache: {response}")