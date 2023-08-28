import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# Load the dataset
df = pd.read_csv('expertise_dataset.csv')

# Remove rows with missing values
df = df.dropna()

# Combine 'Question' and 'Role' columns
df['Combined'] = df['Question'] + ' ' + df['Role']

# Split the dataset into training and test sets
X_train, X_test, y_train, y_test = train_test_split(df['Combined'], df['Expertise'], test_size=0.2, random_state=42, stratify=df['Expertise'])

# Convert the text data into TF-IDF vectors
vectorizer = TfidfVectorizer(max_df=0.95, min_df=5, ngram_range=(1,2))
X_train_vectorized = vectorizer.fit_transform(X_train)
X_test_vectorized = vectorizer.transform(X_test)

# Use SMOTE to balance the classes
sm = SMOTE(random_state=42)
X_train_res, y_train_res = sm.fit_resample(X_train_vectorized, y_train)

# Define the classifier
clf = MultinomialNB()

# Train the classifier
clf.fit(X_train_res, y_train_res)

# Evaluate the classifier
y_pred = clf.predict(X_test_vectorized)
print(classification_report(y_test, y_pred))

# Save the classifier and the vectorizer
joblib.dump(clf, 'expertise_classifier.pkl')
joblib.dump(vectorizer, 'vectorizer.pkl')
